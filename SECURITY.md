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
All user data stays on-device in SQLite. There is no server, no account, no telemetry.

Security issues of interest:
- Arbitrary file read/write via malicious `.apkg` or CSV imports
- XSS in card content (Markdown/HTML rendering via `rehype-sanitize`)
- Tauri IPC command injection