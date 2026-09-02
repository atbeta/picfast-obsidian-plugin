/**
 * Settings tab — exposes the plugin options in Obsidian's Settings
 * dialog. Each control writes back to the plugin's settings and
 * persists via persistSettings().
 *
 * All visible labels come from the i18n module — including dropdown
 * option text and placeholders.
 */

import { App, Notice, PluginSettingTab, Setting } from "obsidian";

import { t } from "./i18n";
import { placeholderPattern, RenameScope, UploadBehavior } from "./settings";
import PicFastImageUploaderPlugin from "./main";

export class PicFastSettingTab extends PluginSettingTab {
  plugin: PicFastImageUploaderPlugin;

  constructor(app: App, plugin: PicFastImageUploaderPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    const labels = t();

    new Setting(containerEl)
      .setName(labels.settingBaseUrl)
      .setDesc(labels.settingBaseUrlDesc)
      .addText((text) =>
        text
          .setPlaceholder("https://picfast.example.com")
          .setValue(this.plugin.settings.baseUrl)
          .onChange(async (value) => {
            this.plugin.settings.baseUrl = value.trim();
            await this.plugin.persistSettings();
          }),
      );

    new Setting(containerEl)
      .setName(labels.settingApiToken)
      .setDesc(labels.settingApiTokenDesc)
      .addText((text) => {
        text
          .setPlaceholder(labels.settingApiTokenPlaceholder)
          .setValue(this.plugin.settings.apiToken)
          .onChange(async (value) => {
            this.plugin.settings.apiToken = value.trim();
            await this.plugin.persistSettings();
          });
        text.inputEl.type = "password";
      });

    new Setting(containerEl)
      .setName(labels.settingUploadBehavior)
      .setDesc(labels.settingUploadBehaviorDesc)
      .addDropdown((dropdown) =>
        dropdown
          .addOption("off", labels.settingUploadBehaviorOptionOff)
          .addOption("ask", labels.settingUploadBehaviorOptionAsk)
          .addOption("on", labels.settingUploadBehaviorOptionOn)
          .setValue(this.plugin.settings.uploadBehavior)
          .onChange(async (value) => {
            this.plugin.settings.uploadBehavior = value as UploadBehavior;
            await this.plugin.persistSettings();
          }),
      );

    new Setting(containerEl)
      .setName(labels.settingNamePattern)
      .setDesc(labels.settingNamePatternDesc)
      .addText((text) =>
        text
          .setPlaceholder(placeholderPattern())
          .setValue(this.plugin.settings.namePattern)
          .onChange(async (value) => {
            this.plugin.settings.namePattern = value.trim();
            await this.plugin.persistSettings();
          }),
      );

    new Setting(containerEl)
      .setName(labels.settingRenameScope)
      .setDesc(labels.settingRenameScopeDesc)
      .addDropdown((dropdown) =>
        dropdown
          .addOption("paste", labels.settingRenameScopeOptionPaste)
          .addOption("all", labels.settingRenameScopeOptionAll)
          .setValue(this.plugin.settings.renameScope)
          .onChange(async (value) => {
            this.plugin.settings.renameScope = value as RenameScope;
            await this.plugin.persistSettings();
          }),
      );

    new Setting(containerEl)
      .setName(labels.settingLocalMirror)
      .setDesc(labels.settingLocalMirrorDesc)
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.localMirror)
          .onChange(async (value) => {
            this.plugin.settings.localMirror = value;
            await this.plugin.persistSettings();
          }),
      );

    new Setting(containerEl)
      .setName(labels.settingShowRibbonIcon)
      .setDesc(labels.settingShowRibbonIconDesc)
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showRibbonIcon)
          .onChange(async (value) => {
            if (value !== this.plugin.settings.showRibbonIcon) {
              this.plugin.settings.showRibbonIcon = value;
              await this.plugin.persistSettings();
              // Obsidian does not expose a removeRibbonIcon API, so the
              // new state only takes effect when the plugin is reloaded.
              new Notice(t().noticeReloadPlugin);
            }
          }),
      );
  }
}
