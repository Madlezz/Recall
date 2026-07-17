/**
 * Recall Sync Relay - Cloudflare Worker + R2
 *
 * This relay stores ONLY encrypted blobs. It never sees:
 * - The encryption key (derived from sync code via PBKDF2)
 * - The plaintext data (AES-GCM encrypted before upload)
 *
 * The blob key is a SHA-256 hash of the sync code, so the relay
 * can't reverse it to get the key either.
 *
 * Endpoints:
 *   GET    /health         - health check
 *   GET    /sync/:key      - download encrypted blob (ETag = revision)
 *   PUT    /sync/:key      - upload with If-Match optimistic concurrency
 *   DELETE /sync/:key      - delete blob (unlink device)
 *
 * Concurrency: each blob has a monotonic `revision` in R2 customMetadata.
 * PUT requires If-Match to equal the current revision (use "0" for create).
 * Stale writers get 409 Conflict + current ETag.
 *
 * Rate limiting: 60 requests per minute per IP (Cloudflare built-in).
 * Blob TTL: 90 days since last update (auto-expired if not synced).
 */

export interface Env {
  RECALL_SYNC: R2Bucket;
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Device-Id, If-Match",
    "Access-Control-Expose-Headers": "ETag",
  };
}

function stripEtagQuotes(value: string | null): string | null {
  if (value == null) return null;
  const t = value.trim();
  if (t.startsWith("W/")) return stripEtagQuotes(t.slice(2));
  if (t.startsWith('"') && t.endsWith('"') && t.length >= 2) {
    return t.slice(1, -1);
  }
  return t;
}

function revisionOf(object: R2Object | null): string | null {
  if (!object) return null;
  return object.customMetadata?.revision ?? "0";
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const cors = corsHeaders();

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          ...cors,
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    if (path === "/health") {
      return new Response(JSON.stringify({ status: "ok", service: "recall-sync" }), {
        headers: {
          "Content-Type": "application/json",
          ...cors,
        },
      });
    }

    const syncMatch = path.match(/^\/sync\/([a-f0-9]{64})$/);
    if (!syncMatch) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    const blobKey = syncMatch[1];
    if (!/^[a-f0-9]{64}$/.test(blobKey)) {
      return new Response(JSON.stringify({ error: "Invalid sync key" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    try {
      switch (request.method) {
        case "GET": {
          const object = await env.RECALL_SYNC.get(blobKey);
          if (!object) {
            return new Response(null, {
              status: 404,
              headers: cors,
            });
          }
          const rev = revisionOf(object) ?? "0";
          const data = await object.text();
          return new Response(data, {
            headers: {
              "Content-Type": "application/json",
              ETag: `"${rev}"`,
              ...cors,
            },
          });
        }

        case "PUT": {
          const body = await request.text();

          if (body.length > 50 * 1024 * 1024) {
            return new Response(JSON.stringify({ error: "Payload too large" }), {
              status: 413,
              headers: { "Content-Type": "application/json", ...cors },
            });
          }

          try {
            const parsed = JSON.parse(body);
            if (!parsed.ciphertext || !parsed.iv || !parsed.salt) {
              throw new Error("Missing required fields");
            }
          } catch {
            return new Response(JSON.stringify({ error: "Invalid payload format" }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...cors },
            });
          }

          const existing = await env.RECALL_SYNC.head(blobKey);
          const currentRev = revisionOf(existing);
          const ifMatch = stripEtagQuotes(request.headers.get("If-Match"));

          if (currentRev != null) {
            // Update: require exact match (clients send ETag from last GET)
            if (ifMatch == null || ifMatch !== currentRev) {
              return new Response(
                JSON.stringify({ error: "Conflict", revision: currentRev }),
                {
                  status: 409,
                  headers: {
                    "Content-Type": "application/json",
                    ETag: `"${currentRev}"`,
                    ...cors,
                  },
                },
              );
            }
          } else {
            // Create: allow missing If-Match, "*", or "0"
            if (ifMatch != null && ifMatch !== "*" && ifMatch !== "0") {
              return new Response(
                JSON.stringify({ error: "Conflict", revision: "0" }),
                {
                  status: 409,
                  headers: {
                    "Content-Type": "application/json",
                    ETag: '"0"',
                    ...cors,
                  },
                },
              );
            }
          }

          const nextRev =
            currentRev == null ? "1" : String((Number.parseInt(currentRev, 10) || 0) + 1);

          await env.RECALL_SYNC.put(blobKey, body, {
            customMetadata: {
              updatedAt: new Date().toISOString(),
              deviceId: request.headers.get("X-Device-Id") || "unknown",
              revision: nextRev,
            },
          });

          return new Response(JSON.stringify({ success: true, revision: nextRev }), {
            headers: {
              "Content-Type": "application/json",
              ETag: `"${nextRev}"`,
              ...cors,
            },
          });
        }

        case "DELETE": {
          await env.RECALL_SYNC.delete(blobKey);
          return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json", ...cors },
          });
        }

        default:
          return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { "Content-Type": "application/json", ...cors },
          });
      }
    } catch (error) {
      console.error("Sync relay error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...cors },
      });
    }
  },
};
