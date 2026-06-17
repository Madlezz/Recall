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

Recall is a local desktop application with no network access beyond optional desktop notifications.

## Automated Auditing

- **JavaScript/TypeScript**: Dependabot + `pnpm audit`
- **Rust**: `cargo audit` runs on every CI push/PR
- **CodeQL**: GitHub CodeQL analyzes JS/TS on every push

## Known Upstream Vulnerabilities

As of the latest release, there are no known unpatched vulnerabilities in our direct dependencies.

Some transitive dependencies may have advisories flagged by `cargo audit` or `pnpm audit`. These are tracked and updated as upstream fixes become available. See the [Security Advisories](https://github.com/Madlezz/Recall/security/advisories) page for detailed information.

## Supply Chain Security

- All dependencies are pinned to compatible semver ranges
- `pnpm-lock.yaml` is committed to ensure reproducible builds
- Dependabot is configured for automated security updates
