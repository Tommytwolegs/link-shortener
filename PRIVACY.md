# Privacy Policy

**Amazon Link Shortener** does not collect, store, transmit, sell, or share any personal data.

## What the extension does

The extension reads the URL of pages you visit on Amazon storefronts (amazon.com, amazon.co.uk, amazon.de, etc., and other regional Amazon domains) for the sole purpose of rewriting that URL in your browser's address bar to a shorter, canonical form (e.g., `https://www.amazon.com/dp/B08N5WRWNW`).

All processing happens locally in your browser. The extension:

- Does **not** make any network requests.
- Does **not** use any analytics, tracking, or telemetry SDKs.
- Does **not** share any data with the developer or with any third party.
- Does **not** read or modify any web page content other than the URL of the active Amazon tab.

The only data the extension stores is a single boolean — your on/off toggle preference — in `chrome.storage.sync`. That field syncs between your own Chrome installations through your Google account; it is not sent to the developer.

## Permissions

| Permission | Purpose |
|---|---|
| Host access on Amazon storefronts | Allows the content script to run on Amazon pages and rewrite the URL. |
| `webNavigation` | Detects in-page navigations (history `pushState`) on Amazon, so single-page transitions also get the URL cleaned up. |
| `storage` | Remembers your on/off toggle preference (a single boolean) across browser restarts and across Chrome installations signed in to the same Google account. |

## Changes to this policy

If the extension's behavior ever changes in a way that affects privacy, this policy will be updated and the version number in `manifest.json` will be incremented.

## Contact

For questions, file an issue at the project's GitHub repository.

_Last updated: 2026-04-23._
