# Confluence Edit Lock

**English** | [简体中文](./README.zh.md)

Fixes the "page jumps to top when clicking empty space" bug in Confluence's classic editor on Chromium browsers.

## Features

- Automatically activates on Confluence edit pages, preventing the jump-to-top behavior when clicking margins
- Toolbar icon offers a three-state toggle (Auto / Force on / Force off); an `ON` badge on the icon means the current page is locked

Does nothing outside edit pages; never injects on non-`*confluence*` domains.

## Applicability

This bug exists in Confluence Server / Data Center using the **classic TinyMCE editor** (the one embedded in `<iframe id="wysiwygTextarea_ifr">`), on Chromium-based browsers only.

- **Affected**: Confluence Server / DC versions before **9.2.11** and before **10.1.0** — Atlassian fixed it upstream in those releases ([CONFSERVER-100547](https://jira.atlassian.com/browse/CONFSERVER-100547))
- **Not affected**: Confluence Cloud (uses the new Atlaskit editor), Confluence DC 9.2.11+ / 10.1.0+, or any browser that isn't Chromium (Firefox / Safari are fine without this extension)

If your instance is already on a fixed version, you don't need this extension.

## Auto-mode matching rules

The extension only acts when **both** conditions are true:

1. The hostname contains the substring `confluence` (case-insensitive). Examples that match: `confluence.company.com`, `pdconfluence.example.com`, `wiki.confluence.internal`. Examples that don't: `wiki.company.com`, `kb.team.io`.
2. The URL looks like an edit page **and** an editor DOM node is present on the page.

The URL is considered an edit page if it matches any of:

- `resumedraft.action` (resuming a draft)
- `?action=edit` or `&action=edit` (classic edit URL)
- `/edit-v2/` (newer edit route)
- `/pages/editpage.action`
- `/pages/createpage.action`

The editor DOM check looks for any of: `iframe#wysiwygTextarea_ifr`, `iframe.tox-edit-area__iframe`, `.ProseMirror`, `[contenteditable='true']`.

If your Confluence host doesn't contain the word `confluence` (e.g. a custom `wiki.company.com`), auto-mode won't trigger — use **Force on** from the toolbar popup.

## Supported browsers

- Chrome 88+
- Edge 88+
- Other Chromium-based browsers (Brave / Arc / Vivaldi / Opera, etc.)

Firefox and Safari don't have this bug — no need to install.

## Installation

```bash
git clone https://github.com/ydbdyds/lock-confluence.git
```

1. Open `chrome://extensions` (or `edge://extensions` on Edge)
2. Enable "Developer mode" in the top-right corner
3. Click "Load unpacked" and select the cloned directory

Open a Confluence edit page — the `ON` badge on the toolbar icon means it's active.

## License

MIT
