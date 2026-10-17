const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(process.env.UNIQUE_CORE_PATH || path.join(__dirname, '../src/unique-core.js'), 'utf8');
const helper = source.slice(source.indexOf('function removeLinkFromContent('), source.indexOf('function isDailyNoteEmpty('));
const start = source.indexOf('  async handleFileDeletion(');
const method = source.slice(start, source.indexOf('  async cleanEmptyDailyNotes(', start));

async function clean(content, deletedPath) {
  const daily = { path: 'Diario/2026-10/2026-10-16.md', basename: '2026-10-16' };
  let result = content;
  const context = {
    getScopedMarkdownFiles: () => [daily],
    withoutExtension: (value) => value.replace(/\.md$/i, ''),
    escapeRegExp: (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    Notice: class {},
  };
  vm.createContext(context);
  vm.runInContext(helper + '\nthis.TestPlugin = class {' + method + '\n};', context);
  const plugin = new context.TestPlugin();
  plugin.app = {
    vault: {
      getMarkdownFiles: () => [daily], read: async () => content,
      modify: async (_, value) => { result = value; },
      delete: async () => { throw new Error('automatic daily-note deletion'); },
    },
    metadataCache: { getFileCache: () => ({}) },
  };
  plugin.isDailyFile = () => true;
  plugin.loadData = async () => ({});
  await plugin.handleFileDeletion(deletedPath, path.basename(deletedPath, '.md'));
  return result;
}

test('deleting a note preserves surrounding diary text and unrelated same-basename links', async () => {
  const input = '# Diary\nPersonal [[Folder/Note|reference]] text\n- [[Other/Note]]\n- [[Note]]\n- [[Folder/Note]]\n';
  const result = await clean(input, 'Folder/Note.md');
  assert.ok(result.includes('Personal  text'));
  assert.ok(result.includes('[[Other/Note]]'));
  assert.ok(result.includes('[[Note]]'));
  assert.ok(!result.includes('[[Folder/Note'));
});

test('removing the last generated link keeps the daily note and its headings', async () => {
  assert.equal(await clean('# Diary\n## Classes\n- [[Folder/Note]]\n', 'Folder/Note.md'), '# Diary\n## Classes\n');
});
