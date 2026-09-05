/*
 * Unique Suite — community entry (bundled by esbuild into a single main.js).
 * Hosts Unique core + Unique Agenda under one plugin id.
 * Do NOT enable alongside separate unique + unique-agenda plugins.
 */
const { Plugin, Notice } = require("obsidian");

const UniqueCorePlugin = require("./unique-core.js");
const AgendaModule = require("./unique-agenda-core.js");
const UniqueAgendaCorePlugin = AgendaModule.default || AgendaModule;

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
  instance.manifest = host.manifest;
  instance._suiteHost = host;
  instance._suiteNamespace = settingsNamespace;

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

module.exports = class UniqueSuitePlugin extends Plugin {
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
    if (changed) await this.saveData(all);

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
    } catch (err) {
      console.error("Unique Suite: error cargando Agenda", err);
      new Notice("Unique Suite: error en Agenda — revisa la consola.", 8000);
    }
  }

  onunload() {
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
