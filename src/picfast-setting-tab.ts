/**
 * Settings tab — exposes the four user-visible options in Obsidian's
 * Settings dialog. Wires each control back to plugin settings and
 * persists via saveSettings().
 */

import { App, PluginSettingTab, Setting } from "obsidian";

import { t } from "./i18n";
import {
  UploadBehavior,
  InsertFormat,
} from "./settings";
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
            const v = value as UploadBehavior;
            this.plugin.settings.uploadBehavior = v;
            await this.plugin.persistSettings();
            // Handlers are re-registered on the next load; we don't tear them
            // down live because the editor instance outlives this change.
          }),
      );

    new Setting(containerEl)
      .setName(t().settingDefaultFormat)
      .setDesc(t().settingDefaultFormatDesc)
      .addDropdown((dropdown) =>
        dropdown
          .addOption("markdown", "Markdown — ![](url)")
          .addOption("url", "Bare URL")
          .addOption("html", "HTML — <img>")
          .addOption("bbcode", "BBCode — [img]url[/img]")
          .setValue(this.plugin.settings.defaultFormat)
          .onChange(async (value) => {
            this.plugin.settings.defaultFormat = value as InsertFormat;
            await this.plugin.persistSettings();
          }),
      );

    const info = containerEl.createDiv({ cls: "setting-item" });
    info.createDiv({
      cls: "setting-item-info",
      text: t().settingCliAuto,
    });
    const ctrl = info.createDiv({ cls: "setting-item-control" });
    ctrl.createDiv({
      cls: "setting-item-description",
      text: t().settingCliAutoDesc,
    });
  }
}