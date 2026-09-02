# PicFast Image Uploader

Obsidian plugin that uploads pasted or dropped images to your [PicFast](https://github.com/atbeta/picfast) instance — **no PicGo middleman, no extra config**.

![Demo](docs/demo.png)

## Why

Every other image uploader for Obsidian routes through PicGo / PicList / PicGo-Core. That means three layers of config (Obsidian → PicGo → your image host) and one extra process to keep alive. PicFast already speaks a clean REST API, so this plugin talks to it directly with `requestUrl` and zero dependencies.

## Features

- 📋 **Upload from clipboard** — `Ctrl/Cmd+Shift+V` or click the ribbon icon
- 🖱️ **Drop or paste** — configurable behaviour per paste / drop event (Off / Ask / On)
- 🏷️ **Filename template** — rename screenshots to `<note>-<timestamp>` on upload: `{{fileName}}`, `{{imageNameKey}}` (frontmatter), `{{DATE:YYYYMMDD-HHmmss}}`, `{{originalName}}`; duplicates get `-2`, `-3`… suffixes. Empty = keep the original name. Scope is configurable (pasted only / pasted + dragged).
- 🛡️ **Local mirror** (optional) — keep a copy of every uploaded image in `<note>.assets/` next to the note; if an upload fails with the mirror on, the image is saved locally instead so the paste never lands empty
- 🪄 **Auto-discovery** — reads `~/.config/picfast/config.json` (Linux/macOS/Windows) and `PICFAST_URL` / `PICFAST_TOKEN` env vars; values you set in Obsidian settings always win
- 🌐 **No CORS pain** — uses Obsidian's `requestUrl`, which goes through Node's net stack
- 🌏 **i18n** — English + Simplified Chinese

PDF and other non-image drops are intentionally ignored — PicFast is an image host, not a file host, so those fall through to Obsidian's default behaviour (save to vault attachment folder).

## Install

### From Community Plugins (when approved)

Settings → Community plugins → Browse → search "PicFast Image Uploader" → Install → Enable.

### BRAT (internal / pre-release)

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) from Community plugins.
2. BRAT settings → "Add Beta plugin" → paste `atbeta/picfast-obsidian-plugin`.
3. Enable PicFast Image Uploader in Community plugins.

### Manual

1. Download `main.js`, `manifest.json`, `styles.css` from the [latest release](https://github.com/atbeta/picfast-obsidian-plugin/releases).
2. Create `.obsidian/plugins/picfast-image-uploader/` inside your vault.
3. Drop the three files into that folder.
4. Settings → Community plugins → enable PicFast Image Uploader.

## Configuration

Settings → PicFast:

| Setting | Description |
|---|---|
| **Base URL** | Your PicFast instance root, e.g. `https://picfast.example.com`. Auto-filled if `PICFAST_URL` env var is set, or if `~/.config/picfast/config.json` exists. |
| **API token** | Optional. Bearer token for authenticated uploads; auto-filled from `PICFAST_TOKEN` env or CLI config. |
| **Upload behavior** | `Off` (Obsidian default for images), `Ask each time` (recommended — shows a small menu per paste/drop), `Always upload`. |
| **Filename template** | Empty (keep original names) or a token pattern, e.g. `{{fileName}}-{{DATE:YYYYMMDD-HHmmss}}`. Applies to pasted images by default; dragged files can be included via *Rename scope*. |
| **Rename scope** | `Pasted images only` (default) or `Pasted and dragged images`. |
| **Local mirror** | Off by default. When on, each uploaded image is copied to `<note name>.assets/` next to the note; failed uploads fall back to a local save so the image is never lost. |
| **Insert format** | `Markdown` (`![](url)`), `Bare URL`, `HTML` (`<img>`), `BBCode` (`[img]url[/img]`). |

## Pairing with the `picfast` CLI

If you have the [picfast npm CLI](https://github.com/atbeta/picfast) installed globally, run `npx picfast config set url https://your-instance` and `npx picfast config set token …` once. The plugin reads the same config file and you never have to type the URL twice.

## Build from source

```bash
git clone https://github.com/atbeta/picfast-obsidian-plugin
cd picfast-obsidian-plugin
npm install
npm run dev      # watch mode
npm run build    # production build → main.js
```

## License

GPL-3.0-or-later. See [LICENSE](./LICENSE).

## Related

- [atbeta/picfast](https://github.com/atbeta/picfast) — server, web UI, MCP, VSCode extension, CLI
- [Obsidian plugin submission requirements](https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins)