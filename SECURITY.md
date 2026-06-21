# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | ✅        |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Use [GitHub's private vulnerability reporting](https://github.com/Madlezz/Recall/security/advisories/new).

You'll receive a response within 72 hours. If the issue is confirmed, a patch will be released
as soon as possible and you'll be credited in the changelog.

## Scope

Recall is a local desktop application. Network access is limited to:
- Auto-update checks via GitHub Releases (signed ed25519, optional)
- Optional desktop notifications

## Automated Auditing

- **JavaScript/TypeScript**: Dependabot + `pnpm audit`
- **Rust**: `cargo audit` runs on every CI push/PR (ignore justifications in `src-tauri/.cargo/audit.toml`)
- **CodeQL**: GitHub CodeQL analyzes both JS/TS and Rust on every push

## Known Upstream Vulnerabilities

As of the latest release, there are no known unpatched vulnerabilities in our direct dependencies.

Some transitive dependencies may have advisories flagged by `cargo audit` or `pnpm audit`. These are tracked and updated as upstream fixes become available. See the [Security Advisories](https://github.com/Madlezz/Recall/security/advisories) page for detailed information.

## Supply Chain Security

- All dependencies are pinned to compatible semver ranges
- `pnpm-lock.yaml` is committed to ensure reproducible builds
- Dependabot is configured for automated security updates

## Release Verification

Every release includes:
- **SHA256SUMS** — verify download integrity with `sha256sum -c SHA256SUMS`
- **Signed updater bundles** — Tauri updater verifies ed25519 signatures before installing

## Code Signing Status

**Binaries are not OS-signed.** This means:

### Windows
SmartScreen may warn "Windows protected your PC" on first run. To proceed:
1. Click **"More info"**
2. Click **"Run anyway"**

To verify authenticity, check the SHA256SUMS file against your download.

### macOS
Gatekeeper may block the app with "Recall cannot be opened because the developer cannot be verified." To proceed:
1. Right-click the app → **Open** (instead of double-click)
2. Click **Open** in the dialog

Alternatively, remove the quarantine attribute:
```bash
xattr -cr /Applications/Recall.app
```

### Future: OS-level signing
Authenticode (Windows) and notarization (macOS) require paid certificates. This is tracked for future releases but not currently implemented.
