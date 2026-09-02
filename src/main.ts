/**
 * PicFast Image Uploader — Obsidian plugin entry point.
 *
 * Lifecycle:
 *   onload:        load settings → auto-populate from CLI config → register
 *                  commands, ribbon icon, document-level paste / drop handlers,
 *                  and the Settings tab.
 *   onunload:      Obsidian tears down registered events automatically;
 *                  no explicit cleanup needed.
 *
 * Paste / drop interception: we listen at document level with `useCapture=true`
 * so we run *before* Obsidian's default handler, which would otherwise save
 * the image into the vault's attachment folder.
 */

import {
  Editor,
  MarkdownView,
  Notice,
  Plugin,
} from "obsidian";

import { autoPopulateSettings } from "./config-discovery";
import { uploadFromClipboard } from "./commands/upload-from-clipboard";
import { uploadImageAtCursor } from "./commands/upload-image-at-cursor";
import { uploadSelectedFile } from "./commands/upload-selected-file";
import {
  findImageAtCursor,
  isRemotePath,
} from "./cursor-image";
import { handleEditorImage } from "./editor-image-handler";
import { initLocale, t } from "./i18n";
import { PicFastSettingTab } from "./picfast-setting-tab";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  PicFastSettings,
  saveSettings,
} from "./settings";

export default class PicFastImageUploaderPlugin extends Plugin {
  settings: PicFastSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    initLocale();
    await this.loadAndPopulateSettings();

    // Ribbon icon — same command as Ctrl/Cmd+Shift+V, for users who'd rather click.
    this.addRibbonIcon(
      "cloud-upload",
      t().cmdUploadClipboardRibbon,
      () => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        const editor = view?.editor;
        if (!editor) {
          new Notice("PicFast: no active editor.");
          return;
        }
        uploadFromClipboard({ app: this.app, editor, settings: this.settings }).catch(
          (err) => {
            // eslint-disable-next-line no-console
            console.error("[PicFast] clipboard upload failed:", err);
          },
        );
      },
    );

    // Commands.
    this.addCommand({
      id: "upload-from-clipboard",
      name: t().cmdUploadClipboard,
      editorCheckCallback: (checking, editor, _ctx) => {
        if (checking) return true;
        uploadFromClipboard({ app: this.app, editor, settings: this.settings }).catch(
          (err) => {
            // eslint-disable-next-line no-console
            console.error("[PicFast] clipboard upload failed:", err);
          },
        );
      },
    });

    this.addCommand({
      id: "upload-selected-file",
      name: t().cmdUploadFile,
      editorCheckCallback: (checking, editor, _ctx) => {
        if (checking) return true;
        uploadSelectedFile({ app: this.app, editor, settings: this.settings }).catch(
          (err) => {
            // eslint-disable-next-line no-console
            console.error("[PicFast] selected-file upload failed:", err);
          },
        );
      },
    });

    // Cursor-on-image-link command — only enabled when the cursor is
    // sitting inside a markdown / wikilink image reference.
    this.addCommand({
      id: "upload-image-at-cursor",
      name: t().cmdUploadAtCursor,
      editorCheckCallback: (checking, editor, _ctx) => {
        const match = findImageAtCursor(editor);
        const enabled = match !== null && !isRemotePath(match.rawPath);
        if (checking) return enabled;
        if (!enabled || !match) return;
        uploadImageAtCursor({
          app: this.app,
          editor,
          match,
          settings: this.settings,
        }).catch((err) => {
          // eslint-disable-next-line no-console
          console.error("[PicFast] cursor upload failed:", err);
        });
      },
    });

    // Document-level paste / drop interception. `useCapture=true` runs us
    // before Obsidian's default handler, which is what lets us replace the
    // "save into vault attachment" behaviour with "upload + insert link".
    this.registerDomEvent(document, "paste", this.onPasteCapture, true);
    this.registerDomEvent(document, "drop", this.onDropCapture, true);

    // Right-click menu: add "Upload image at cursor to PicFast" when the
    // cursor is over an image link that points at a local file.
    this.registerEvent(
      this.app.workspace.on(
        "editor-menu",
        (menu, editor, _view) => {
          const match = findImageAtCursor(editor);
          if (!match || isRemotePath(match.rawPath)) return;
          menu.addItem((item) =>
            item
              .setTitle(t().cmdUploadAtCursor)
              .setIcon("cloud-upload")
              .onClick(() => {
                uploadImageAtCursor({
                  app: this.app,
                  editor,
                  match,
                  settings: this.settings,
                }).catch((err) => {
                  // eslint-disable-next-line no-console
                  console.error("[PicFast] cursor upload failed:", err);
                });
              }),
          );
        },
      ),
    );

    // Settings tab.
    this.addSettingTab(new PicFastSettingTab(this.app, this));
  }

  private onPasteCapture = (evt: ClipboardEvent): void => {
    if (!evt.clipboardData) return;
    // Only act when the paste lands inside a markdown editor.
    if (!isInMarkdownEditor(evt.target)) return;
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    const editor = view?.editor;
    if (!editor) return;

    // Note: handleEditorImage calls evt.preventDefault() synchronously
    // when it decides to consume the event. We must NOT do it from a
    // Promise callback — by then the event has already propagated.
    handleEditorImage({
      app: this.app,
      editor,
      dataTransfer: evt.clipboardData,
      settings: this.settings,
      sourceLabel: "paste",
      event: evt,
    });
  };

  private onDropCapture = (evt: DragEvent): void => {
    if (!evt.dataTransfer) return;
    if (!isInMarkdownEditor(evt.target)) return;
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    const editor = view?.editor;
    if (!editor) return;

    handleEditorImage({
      app: this.app,
      editor,
      dataTransfer: evt.dataTransfer,
      settings: this.settings,
      sourceLabel: "drop",
      anchor: evt as unknown as MouseEvent,
      event: evt,
    });
  };

  async loadAndPopulateSettings(): Promise<void> {
    const stored = await loadSettings(this);
    const { settings, populated } = await autoPopulateSettings(stored);
    this.settings = settings;
    if (populated.length > 0) {
      await saveSettings(this, this.settings);
      new Notice(t().noticeAutoPopulated(populated));
    }
  }

  async persistSettings(): Promise<void> {
    await saveSettings(this, this.settings);
  }
}

/**
 * Returns true only when the paste / drop landed inside a CodeMirror
 * editor owned by Obsidian — otherwise we'd intercept global paste
 * events meant for the search box, settings dialog, etc.
 */
function isInMarkdownEditor(target: EventTarget | null): boolean {
  if (!(target instanceof Node)) return false;
  // CodeMirror v6 (Obsidian uses this since 1.0) attaches `cm-content`
  // to its editable root. v5 used `CodeMirror`. We check both for safety.
  let node: Node | null = target;
  while (node) {
    if (node instanceof HTMLElement) {
      if (
        node.classList.contains("cm-content") ||
        node.classList.contains("CodeMirror")
      ) {
        return true;
      }
    }
    node = node.parentNode;
  }
  return false;
}

// Editor type is referenced transitively through handleEditorImage's opts,
// which the bundler strips — keep this for type-checking clarity.
export type { Editor };