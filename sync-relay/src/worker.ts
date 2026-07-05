/**
 * Recall Sync Relay — Cloudflare Worker + R2
 *
 * This relay stores ONLY encrypted blobs. It never sees:
 * - The encryption key (derived from sync code via PBKDF2)
 * - The plaintext data (AES-GCM encrypted before upload)
 *
 * The blob key is a SHA-256 hash of the sync code, so the relay
 * can't reverse it to get the key either.
 *
 * Endpoints:
 *   GET    /health         — health check
 *   GET    /sync/:key      — download encrypted blob
 *   PUT    /sync/:key      — upload encrypted blob
 *   DELETE /sync/:key      — delete blob (unlink device)
 *
 * Rate limiting: 60 requests per minute per IP (Cloudflare built-in).
 * Blob TTL: 90 days since last update (auto-expired if not synced).
 */

export interface Env {
  RECALL_SYNC: R2Bucket;
}

/** Blob TTL: 90 days since last update (documented in README, R2 lifecycle rule enforces this) */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const BLOB_TTL_SECONDS = 90 * 24 * 60 * 60;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // ── CORS ──
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, X-Device-Id",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // ── Health check ──
    if (path === "/health") {
      return new Response(JSON.stringify({ status: "ok", service: "recall-sync" }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // ── Sync endpoints ──
    const syncMatch = path.match(/^\/sync\/([a-f0-9]{64})$/);
    if (!syncMatch) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const blobKey = syncMatch[1];

    // Validate blob key is a valid SHA-256 hash (64 hex chars)
    if (!/^[a-f0-9]{64}$/.test(blobKey)) {
      return new Response(JSON.stringify({ error: "Invalid sync key" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Device-Id",
    };

    try {
      switch (request.method) {
        case "GET": {
          const object = await env.RECALL_SYNC.get(blobKey);
          if (!object) {
            return new Response(null, {
              status: 404,
              headers: corsHeaders,
            });
          }
          const data = await object.text();
          return new Response(data, {
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          });
        }

        case "PUT": {
          const body = await request.text();

          // Size limit: 50MB max (encrypted state should be much smaller)
          if (body.length > 50 * 1024 * 1024) {
            return new Response(JSON.stringify({ error: "Payload too large" }), {
              status: 413,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          }

          // Validate it's valid JSON with expected fields
          try {
            const parsed = JSON.parse(body);
            if (!parsed.ciphertext || !parsed.iv || !parsed.salt) {
              throw new Error("Missing required fields");
            }
          } catch {
            return new Response(JSON.stringify({ error: "Invalid payload format" }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          }

          // Store with custom metadata for TTL tracking
          await env.RECALL_SYNC.put(blobKey, body, {
            customMetadata: {
              updatedAt: new Date().toISOString(),
              deviceId: request.headers.get("X-Device-Id") || "unknown",
            },
          });

          return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        case "DELETE": {
          await env.RECALL_SYNC.delete(blobKey);
          return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        default:
          return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
      }
    } catch (error) {
      console.error("Sync relay error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  },
};
