# Confluence Edit Lock

[简体中文](./README.md) | **English**

Fixes the "page jumps to top when clicking empty space" bug in Confluence's classic editor on Chromium browsers.

## Features

- Automatically activates on Confluence edit pages, preventing the jump-to-top behavior when clicking margins
- Toolbar icon offers a three-state toggle (Auto / Force on / Force off); an `ON` badge on the icon means the current page is locked

Does nothing outside edit pages; never injects on non-`*confluence*` domains.

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
