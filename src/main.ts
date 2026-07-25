/**
 * PicFast Image Uploader — Obsidian plugin entry point.
 *
 * Lifecycle:
 *   onload:        load settings → auto-populate from CLI config → register
 *                  commands, ribbon icon, editor paste / drop handlers, and
 *                  the Settings tab.
 *   onunload:      Obsidian tears down registered events automatically;
 *                  no explicit cleanup needed.
 */

import {
  Editor,
  MarkdownView,
  Notice,
  Plugin,
  Workspace,
} from "obsidian";

import { autoPopulateSettings } from "./config-discovery";
import { uploadFromClipboard } from "./commands/upload-from-clipboard";
import { uploadSelectedFile } from "./commands/upload-selected-file";
import { handleEditorImage } from "./editor-image-handler";
import { initLocale, t } from "./i18n";
import { PicFastSettingTab } from "./picfast-setting-tab";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  PicFastSettings,
  saveSettings,
} from "./settings";

export class PicFastImageUploaderPlugin extends Plugin {
  settings: PicFastSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    initLocale();
    await this.loadAndPopulateSettings();

    // Ribbon icon — same command as Cmd+Shift+V, for users who'd rather click.
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
        uploadFromClipboard({ editor, settings: this.settings }).catch(
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
        uploadFromClipboard({ editor, settings: this.settings }).catch(
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
        uploadSelectedFile({ editor, settings: this.settings }).catch(
          (err) => {
            // eslint-disable-next-line no-console
            console.error("[PicFast] selected-file upload failed:", err);
          },
        );
      },
    });

    // Editor paste / drop handlers. These always run (we can't
    // conditional-register on settings); the handler itself early-exits
    // when behaviour is `off` or when the event carries no image.
    this.registerEditorHandlers(this.app.workspace);

    // Settings tab.
    this.addSettingTab(new PicFastSettingTab(this.app, this));
  }

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

  private registerEditorHandlers(workspace: Workspace): void {
    this.registerEvent(
      workspace.on(
        "editor-paste",
        (evt: ClipboardEvent, editor: Editor, _info: unknown) => {
          if (!evt.clipboardData) return;
          handleEditorImage({
            app: this.app,
            editor,
            dataTransfer: evt.clipboardData,
            settings: this.settings,
            sourceLabel: "paste",
          })
            .then((consumed) => {
              if (consumed) evt.preventDefault();
            })
            .catch((err) => {
              // eslint-disable-next-line no-console
              console.error("[PicFast] paste handler error:", err);
            });
        },
      ),
    );

    this.registerEvent(
      workspace.on(
        "editor-drop",
        (evt: DragEvent, editor: Editor, _info: unknown) => {
          if (!evt.dataTransfer) return;
          handleEditorImage({
            app: this.app,
            editor,
            dataTransfer: evt.dataTransfer,
            settings: this.settings,
            sourceLabel: "drop",
            anchor: evt as unknown as MouseEvent,
          })
            .then((consumed) => {
              if (consumed) evt.preventDefault();
            })
            .catch((err) => {
              // eslint-disable-next-line no-console
              console.error("[PicFast] drop handler error:", err);
            });
        },
      ),
    );
  }

  }