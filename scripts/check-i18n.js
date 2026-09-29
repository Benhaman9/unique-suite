const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { translate, translateElement } = require("../src/i18n.js");

const cases = new Map([
  ["¿Qué ramo es?", "Which course is it?"],
  ["Buscar comando o atajo…", "Search commands or shortcuts…"],
  ["No hay ramos configurados para 2026-2.", "No courses are configured for 2026-2."],
  ["Evento enviado a la papelera: Exam", "Event moved to trash: Exam"],
  ["¿Eliminar «Exam»? La nota se enviará a la papelera de Obsidian.", "Delete “Exam”? The note will be moved to the Obsidian trash."],
  ["Captura rápida enviada a Calculus.", "Quick capture sent to Calculus."],
  ["Nota vinculada con hoy (2026-09-28).", "Note linked to today (2026-09-28)."],
  ["  Cancelar  ", "  Cancel  "],
]);

for (const [spanish, english] of cases) {
  assert.equal(translate(spanish, "en"), english, spanish);
}

const attributes = new Map([["placeholder", "Buscar ramo"]]);
const textNode = { nodeValue: "Cancelar" };
const ownerDocument = {
  defaultView: { NodeFilter: { SHOW_TEXT: 4 } },
  createTreeWalker() {
    let pending = true;
    return {
      currentNode: null,
      nextNode() {
        if (!pending) return false;
        pending = false;
        this.currentNode = textNode;
        return true;
      },
    };
  },
};
const root = {
  ownerDocument,
  matches: () => true,
  querySelectorAll: () => [],
  getAttribute: (name) => attributes.get(name) ?? null,
  setAttribute: (name, value) => attributes.set(name, value),
};
translateElement(root, "en");
assert.equal(textNode.nodeValue, "Cancel");
assert.equal(attributes.get("placeholder"), "Search courses");

const repo = path.resolve(__dirname, "..");
const core = fs.readFileSync(path.join(repo, "src", "unique-core.js"), "utf8");
const agenda = fs.readFileSync(path.join(repo, "src", "unique-agenda-core.js"), "utf8");
const entry = fs.readFileSync(path.join(repo, "src", "main.js"), "utf8");
const bundle = fs.readFileSync(path.join(repo, "main.js"), "utf8");

assert.match(core, /\.locale\(english \? "en" : "es"\)\s*\.format\(english \? "dddd, MMMM D"/);
assert.match(core, /english \? "## Class wrap-up" : "## Cierre de clase"/);
assert.match(core, /english \? "## Quick captures" : "## Capturas rápidas"/);
assert.match(core, /weekly: "semanal"/);
assert.match(core, /\["lunes", "monday"\]/);
assert.match(agenda, /row\["day"\] \|\| row\["dia"\]/);
assert.match(agenda, /row\.start \|\| row\.inicio/);
assert.match(agenda, /parseIcs\(res\.text \|\| "", this\.getLanguage/);
assert.match(agenda, /MONTHS_EN/);
assert.match(agenda, /agendaReadme\(this\.getLanguage/);
assert.match(entry, /this\.agenda\.refreshViews\?\.\(\)/);
assert.match(bundle, /Monday/);
assert.match(bundle, /Unique Agenda history/);

console.log(`i18n checks passed (${cases.size + 14} assertions)`);
