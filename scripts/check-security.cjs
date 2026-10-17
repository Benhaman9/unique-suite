const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadAgenda() {
  const module = { exports: {} };
  const context = {
    module, exports: module.exports, console, window: { setTimeout() {}, setInterval() {} },
    require(id) {
      if (id !== 'obsidian') return require(id);
      return {
        Plugin: class {}, PluginSettingTab: class {}, ItemView: class {}, Modal: class {},
        normalizePath: (value) => value,
        requestUrl: async () => ({ status: 200, text: 'BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:one\nDTSTART:20261016T120000\nEND:VEVENT\nEND:VCALENDAR' }),
      };
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/unique-agenda-core.js'), 'utf8'), context);
  return { Plugin: module.exports.default, eventToMarkdown: context.eventToMarkdown };
}

function makeSecrets() {
  const values = new Map();
  return {
    values,
    getSecret: (id) => values.get(id) ?? null,
    setSecret(id, value) {
      assert.match(id, /^[a-z0-9-]{1,64}$/);
      values.set(id, value);
    },
  };
}

function makePlugin(Plugin, secrets, loaded) {
  const plugin = new Plugin();
  const saved = [];
  plugin.app = {
    secretStorage: secrets,
    vault: { getAbstractFileByPath: () => null, on: () => ({}) },
    metadataCache: { on: () => ({}) },
  };
  plugin.loadData = async () => loaded;
  plugin.saveData = async (data) => saved.push(JSON.parse(JSON.stringify(data)));
  plugin.ensureVaultScaffold = async () => {};
  plugin.registerView = () => {};
  plugin.addRibbonIcon = () => {};
  plugin.addCommand = () => {};
  plugin.addSettingTab = () => {};
  plugin.registerEvent = () => {};
  plugin.scheduleAutoSync = () => {};
  return { plugin, saved };
}

test('legacy credentials migrate to valid SecretStorage IDs and restart without plaintext settings', async () => {
  const { Plugin } = loadAgenda();
  const secrets = makeSecrets();
  const loaded = {
    externalCalendars: [{ id: 'external-a', url: 'private-a' }, { id: 'external-b', url: 'private-b' }],
    googleAccessToken: 'token', googleClientSecret: 'client-secret', pruneMissingGoogle: true,
  };
  const first = makePlugin(Plugin, secrets, loaded);
  await first.plugin.onload();
  const persisted = first.saved.at(-1);
  assert.equal(persisted.externalCalendars[0].url, undefined);
  assert.equal(persisted.googleAccessToken, undefined);
  assert.equal(persisted.googleClientSecret, undefined);
  assert.equal(persisted.pruneMissingGoogle, false);
  assert.equal(secrets.getSecret('unique-suite-agenda-calendar-external-a'), 'private-a');
  assert.equal(secrets.getSecret('unique-suite-agenda-googleaccesstoken'), 'token');
  const restarted = makePlugin(Plugin, secrets, persisted);
  await restarted.plugin.onload();
  assert.equal(restarted.plugin.getIcsFeeds().length, 2);
  const survivingLabel = restarted.plugin.getIcsFeeds()[1].label;
  restarted.plugin.settings.externalCalendars.shift();
  assert.equal(restarted.plugin.getIcsFeeds()[0].label, survivingLabel);
});

test('one UID from two feeds creates two events and an incomplete feed never prunes', async () => {
  const { Plugin } = loadAgenda();
  const plugin = makePlugin(Plugin, makeSecrets(), {}).plugin;
  plugin.settings = { pruneMissingGoogle: true };
  let created = 0;
  plugin.createEvent = async () => ({ path: `event-${++created}.md` });
  const map = new Map();
  const first = { googleId: 'same', googleCalendar: 'A', titulo: 'One', inicio: '2026-10-16T12:00', fin: '2026-10-16T13:00' };
  const second = { ...first, googleCalendar: 'B' };
  assert.equal(await plugin.upsertImported(first, map), 'created');
  assert.equal(await plugin.upsertImported(second, map), 'created');
  assert.equal(created, 2);
  plugin.upsertImported = async () => 'unchanged';
  plugin.pruneMissingFromFeed = async () => { throw new Error('unexpected prune'); };
  const result = await plugin.syncIcsFeed({ label: 'A', url: 'test' }, map);
  assert.equal(result.pruned, 0);
});

test('updating a generated event keeps one safe Markdown heading', () => {
  const { eventToMarkdown } = loadAgenda();
  const ev = { titulo: 'First\n# injected', inicio: '2026-10-16T12:00', fin: '2026-10-16T13:00', origen: 'google' };
  const first = eventToMarkdown(ev, '', 'en');
  const body = first.split('---\n').slice(2).join('---\n').trim();
  const updated = eventToMarkdown({ ...ev, titulo: 'Changed' }, body, 'en');
  assert.equal((updated.match(/^# /gm) || []).length, 1);
  assert.doesNotMatch(updated, /^# injected/m);
});
