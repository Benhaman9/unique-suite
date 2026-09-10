/*
 * Unique Suite — community entry (bundled by esbuild into a single main.js).
 * Hosts Unique core + Unique Agenda under one plugin id.
 * Do NOT enable alongside separate unique + unique-agenda plugins.
 */
const { Plugin, Notice, PluginSettingTab, Setting, moment } = require("obsidian");
const { createI18n, installDomLocalization, normalizeLanguage, translate, translateElement, translatePath } = require("./i18n.js");

const UniqueCorePlugin = require("./unique-core.js");
const AgendaModule = require("./unique-agenda-core.js");
const UniqueAgendaCorePlugin = AgendaModule.default || AgendaModule;

const SETTINGS_MODULE_NAMES = {
  unique: "US-Core",
  agenda: "US-Agenda",
};

const PLUGIN_METHODS = [
  "addCommand",
  "addRibbonIcon",
  "addSettingTab",
  "addStatusBarItem",
  "registerView",
  "registerEvent",
  "registerInterval",
  "registerDomEvent",
  "registerEditorExtension",
  "registerMarkdownPostProcessor",
  "registerMarkdownCodeBlockProcessor",
  "registerExtensions",
  "registerHoverLinkSource",
  "registerObsidianProtocolHandler",
  "registerCodeBlock",
  "addChild",
  "removeChild",
];

function bindHost(instance, host, settingsNamespace) {
  instance.app = host.app;
  instance.manifest = {
    ...host.manifest,
    name: SETTINGS_MODULE_NAMES[settingsNamespace] || host.manifest.name,
  };
  instance._suiteHost = host;
  instance._suiteNamespace = settingsNamespace;
  instance.getLanguage = () => host.language;
  instance.translate = (value) => translate(value, host.language);
  instance.translatePath = (path) => translatePath(path, host.language);
  instance.localizeSettings = (container) => host.localizeSettings(container);

  for (const name of PLUGIN_METHODS) {
    if (typeof host[name] === "function") {
      instance[name] = host[name].bind(host);
    }
  }

  if (typeof host.register === "function") {
    instance.register = host.register.bind(host);
  }

  instance.loadData = async () => {
    const all = (await host.loadData()) || {};
    const slice = all[settingsNamespace];
    return slice && typeof slice === "object" && !Array.isArray(slice) ? slice : {};
  };

  instance.saveData = async (data) => {
    await host._saveNamespace(settingsNamespace, data);
  };
}

class UniqueSuiteGeneralSettingsTab extends PluginSettingTab {
  constructor(app, plugin) {
    const settingsIdentity = Object.create(plugin);
    settingsIdentity.manifest = { ...plugin.manifest, name: "US-General" };
    super(app, settingsIdentity);
  }

  display() {
    this.containerEl.empty();
    this.containerEl.addClass("unique-suite-general-settings");
    this.containerEl.createEl("h2", { text: this.plugin.t("interfaceHeading") });
    new Setting(this.containerEl)
      .setName(this.plugin.t("languageName"))
      .setDesc(this.plugin.t("languageDesc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("es", this.plugin.t("spanish"))
          .addOption("en", this.plugin.t("english"))
          .setValue(this.plugin.language)
          .onChange(async (language) => {
            await this.plugin.setLanguage(language);
            this.display();
          });
      });
    this.containerEl.createEl("h2", { text: this.plugin.t("graphHeading") });
    new Setting(this.containerEl).setDesc(this.plugin.t("graphDesc"));
    this.containerEl.createEl("h2", { text: this.plugin.t("modulesHeading") });
    new Setting(this.containerEl).setDesc(this.plugin.t("modulesDesc"));
  }
}

module.exports = class UniqueSuitePlugin extends Plugin {
  t(key) {
    return this.i18n.t(key);
  }

  translate(value) {
    return translate(value, this.language);
  }

  translatePath(path) {
    return translatePath(path, this.language);
  }

  localizeSettings(container) {
    translateElement(container, this.language);
  }

  async setLanguage(language) {
    this.language = normalizeLanguage(language);
    this.suiteSettings = { ...(this.suiteSettings || {}), language: this.language };
    await this._saveNamespace("suite", this.suiteSettings);
    this.i18n = createI18n(this.language);
    moment.locale(this.i18n.momentLocale);
    this._stopDomLocalization?.();
    this._stopDomLocalization = installDomLocalization(this.language);

    await this.unique?.syncSuiteLanguage?.();
    if (this.agenda?.settings) {
      this.agenda.settings.locale = this.language;
      await this.agenda.saveSettings?.();
    }

    this.app.workspace.getLeavesOfType("inicio-personalizado-view").forEach((leaf) => leaf.view?.render?.());
    this.app.setting?.activeTab?.display?.();
  }

  async _saveNamespace(namespace, data) {
    const run = async () => {
      const all = (await this.loadData()) || {};
      all[namespace] = data;
      await this.saveData(all);
    };
    this._saveQueue = (this._saveQueue || Promise.resolve()).then(run, run);
    return this._saveQueue;
  }

  async onload() {
    const all = (await this.loadData()) || {};
    let changed = false;
    if (!all.unique || typeof all.unique !== "object" || Array.isArray(all.unique)) {
      all.unique = {};
      changed = true;
    }
    if (!all.agenda || typeof all.agenda !== "object" || Array.isArray(all.agenda)) {
      all.agenda = {};
      changed = true;
    }
    if (!all.suite || typeof all.suite !== "object" || Array.isArray(all.suite)) {
      all.suite = {};
      changed = true;
    }
    if (!all.suite.language) {
      all.suite.language = "es";
      changed = true;
    }
    if (changed) await this.saveData(all);

    this.suiteSettings = all.suite;
    this.language = normalizeLanguage(all.suite.language);
    this.i18n = createI18n(this.language);
    moment.locale(this.i18n.momentLocale);
    this._stopDomLocalization = installDomLocalization(this.language);

    this.addSettingTab(new UniqueSuiteGeneralSettingsTab(this.app, this));

    this.unique = Object.create(UniqueCorePlugin.prototype);
    bindHost(this.unique, this, "unique");

    this.agenda = Object.create(UniqueAgendaCorePlugin.prototype);
    bindHost(this.agenda, this, "agenda");

    try {
      await UniqueCorePlugin.prototype.onload.call(this.unique);
    } catch (err) {
      console.error("Unique Suite: error cargando nucleo Unique", err);
      new Notice("Unique Suite: error en Unique — revisa la consola.", 8000);
    }

    try {
      await UniqueAgendaCorePlugin.prototype.onload.call(this.agenda);
      this.agenda.settings.locale = this.language;
      await this.agenda.saveSettings();
      await this.unique.syncSuiteLanguage();
    } catch (err) {
      console.error("Unique Suite: error cargando Agenda", err);
      new Notice("Unique Suite: error en Agenda — revisa la consola.", 8000);
    }
  }

  onunload() {
    this._stopDomLocalization?.();
    try {
      if (this.agenda && typeof this.agenda.onunload === "function") {
        this.agenda.onunload();
      }
    } catch (err) {
      console.warn("Unique Suite: onunload agenda", err);
    }
    try {
      if (this.unique && typeof this.unique.onunload === "function") {
        this.unique.onunload();
      }
    } catch (err) {
      console.warn("Unique Suite: onunload unique", err);
    }
  }
};
