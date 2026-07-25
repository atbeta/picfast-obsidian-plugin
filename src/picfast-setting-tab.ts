/**
 * Settings tab — exposes the three user-visible options in Obsidian's
 * Settings dialog. Each control writes back to the plugin's settings
 * and persists via persistSettings().
 */

import { App, PluginSettingTab, Setting } from "obsidian";

import { t } from "./i18n";
import { UploadBehavior } from "./settings";
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

    new Setting(containerEl)
      .setName(t().settingBaseUrl)
      .setDesc(t().settingBaseUrlDesc)
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
      .setName(t().settingApiToken)
      .setDesc(t().settingApiTokenDesc)
      .addText((text) => {
        text
          .setPlaceholder("optional")
          .setValue(this.plugin.settings.apiToken)
          .onChange(async (value) => {
            this.plugin.settings.apiToken = value.trim();
            await this.plugin.persistSettings();
          });
        text.inputEl.type = "password";
      });

    new Setting(containerEl)
      .setName(t().settingUploadBehavior)
      .setDesc(t().settingUploadBehaviorDesc)
      .addDropdown((dropdown) =>
        dropdown
          .addOption("off", "Off (Obsidian default)")
          .addOption("ask", "Ask each time (recommended)")
          .addOption("on", "Always upload")
          .setValue(this.plugin.settings.uploadBehavior)
          .onChange(async (value) => {
            this.plugin.settings.uploadBehavior = value as UploadBehavior;
            await this.plugin.persistSettings();
          }),
      );
  }
}