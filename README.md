# Meridian Toolkit

**A focused, privacy-first developer workspace** · 原创离线开发者工具集

Meridian is a complete set of **eight functional tools** running inside a browser tab. No server, account, package install, third-party font, CDN or telemetry is required. User text is never persisted to site local storage or uploaded. Only the interface language and theme are saved.

**Source:** https://github.com/AincFh/meridian-toolkit  
**License:** MIT  
**Runtime:** Modern Chromium / Edge / Firefox / Safari; HTTPS or localhost for SHA-256 Web Crypto.

## Product capabilities

| Area | Actual functionality | Notes |
|---|---|---|
| JSON Studio | Pretty print, compact, validate, get nested JSON paths | Strict parser; protected prototype keys |
| CSV Inspector | Parse quoted multiline CSV/TSV/semicolon data; table preview; normalized CSV or JSON | BOM, escaped quotes, formula-injection protection on output |
| Text Diff | Line-by-line additions, deletions and unchanged segments | Bounded LCS, 260 lines per side |
| Encodings | UTF-8 Base64, URL percent encoding and hexadecimal, both directions | Rejects invalid bytes |
| SHA-256 | UTF-8 digest using native Web Crypto | HTTPS / localhost required |
| Time Converter | Unix seconds/milliseconds, ISO 8601 and local time | Device clock, no time API |
| Color Contrast | WCAG luminance contrast, AA / AAA for standard and large text | Three- and six-digit hex |
| Text Lab | Characters, Han, Latin words, lines, UTF-8 bytes, reading estimate and cleanup | No AI requests |

Every tool has consistent local-file import where applicable, keyboard-accessible controls, copy/export and results with clear status feedback. Responsive layouts and coherent appearance work on desktop and mobile.

### Controls

- **Ctrl/⌘ + K:** focus tool search (desktop).
- **Ctrl/⌘ + Enter:** run the currently selected tool's primary action.
- Chinese and English interface; initial language follows the browser, with explicit switch.
- Light and dark appearance with browser system-theme default on first visit.
- Text import accepts JSON, CSV, TXT, MD and LOG; max 4 MB raw and 1,000,000 characters.

### Privacy and security

- No fetch, XHR, telemetry, third-party assets, account or background sync.
- Content Security Policy disallows outbound network connections.
- All user-provided HTML-looking content is treated as plain text, never passed through innerHTML.
- Input and CPU-safety bounds protect the page from enormous CSV and diff operations.
- CSV output quotes cells and neutralizes leading spreadsheet-formula patterns.
- SHA-256 is a digest, not encryption or a password vault.
- Clipboard copy requires browser permission; use file export when unavailable.
- Inputs stay in the current browser page and disappear on reload. Avoid handling secrets on devices or with extensions you do not trust.

## Development and verification

Requires **Node.js 20+**. There are **zero production or development npm dependencies**.

Run:

    npm run qa

This executes syntax checks, Node's unit-test runner, deterministic static build to dist/ and artifact verification including eight panels, CSP and runtime module links.

Local preview:

    python -m http.server 8000

Open http://localhost:8000 . Direct file:// loading may be blocked by modern browser ES-module restrictions.

The GitHub workflow validates pull requests. Publication on main requires Pages enabled in repository Settings → Pages → Source: **GitHub Actions**. An automatic test passing does not by itself prove the public site was deployed.

## Architecture

- src/engines.js — pure utility engines without DOM or external requests.
- src/app.js — user interface, two languages, navigation, results, file import/export, theme and keyboard handling.
- styles.css — unified responsive design, accessibility, light/dark modes and reduced motion.
- tests/engines.test.mjs — roundtrip, edge case and security regression tests.
- scripts/build.mjs + scripts/verify.mjs — audited static build and integrity checks.
- .github/workflows/publish.yml — CI and protected static deployment.

**Boundaries:** v1 offers eight real tools, not a fake operating system, cryptographic vault, Git IDE, full spreadsheet, multi-user editor or autonomous agent. File-size limits are intentional; a successful build is not equivalent to a formal security audit or a full device compatibility matrix.
