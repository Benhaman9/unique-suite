const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the actual rollover code with a deterministic local clock.
class DateValue {
  constructor(value) { this.value = value; }
  isSame(other, unit) {
    return this.value.slice(0, unit === 'month' ? 7 : 10) ===
      other.value.slice(0, unit === 'month' ? 7 : 10);
  }
  clone() { return new DateValue(this.value); }
  startOf() { this.value = this.value.slice(0, 7) + '-01'; return this; }
}

const root = path.resolve(__dirname, '..');
const targets = [
  { calendar: path.join(root, 'src/calendar-original.js'), core: path.join(root, 'src/unique-core.js'), css: path.join(root, 'styles.css') },
];
if (process.argv[2]) {
  targets.push({ calendar: path.join(process.argv[2], 'calendar-original.js'), core: path.join(process.argv[2], 'main.js'), css: path.join(process.argv[2], 'styles.css') });
}

const scenarios = [
  ['2026-09-30', '2026-09-01', '2026-10-01', '2026-10-01'],
  ['2026-12-31', '2026-12-01', '2027-01-01', '2027-01-01'],
  ['2026-09-30', '2026-08-01', '2026-10-01', '2026-08-01'],
  ['2026-09-30', '2026-11-01', '2026-10-01', '2026-11-01'],
  ['2026-09-29', '2026-09-01', '2026-09-30', '2026-09-01'],
  ['2026-09-30', '2026-09-01', '2026-11-03', '2026-11-01'],
];

for (const target of targets) {
  const calendar = fs.readFileSync(target.calendar, 'utf8');
  const tick = calendar.match(/\tfunction tick\(\) \{([\s\S]*?)\n\t\}/);
  assert.ok(tick, 'Calendar tick found');
  assert.match(calendar, /let heartbeat = setInterval\(\s*tick,/);
  const core = fs.readFileSync(target.core, 'utf8');
  const fallback = core.slice(core.indexOf('class UniqueCalendarView extends ItemView'));
  const rollover = fallback.match(/async render\(\) \{([\s\S]*?)const token = \+\+this.renderToken;/);
  assert.ok(rollover, 'Fallback render found');
  assert.match(core, /this\.registerInterval\(window\.setInterval/);
  for (const [previous, displayed, next, expected] of scenarios) {
    const context = {
      today: new DateValue(previous), displayedMonth: new DateValue(displayed),
      window: { moment: () => new DateValue(next) }, $$invalidate: () => {},
    };
    vm.runInNewContext(`(function () {${tick[1]}})()`, context);
    assert.equal(context.today.value, next);
    assert.equal(context.displayedMonth.value, expected, target.calendar);
    // A second refresh must preserve the advanced month.
    vm.runInNewContext(`(function () {${tick[1]}})()`, context);
    assert.equal(context.displayedMonth.value, expected);
    const view = { lastToday: new DateValue(previous), displayedMonth: new DateValue(displayed) };
    vm.runInNewContext(`(function () {${rollover[1]}}).call(view)`, {
      view, moment: () => new DateValue(next),
    });
    assert.equal(view.displayedMonth.value, expected, target.core);
    assert.equal(view.lastToday.value, next);
  }
  const css = fs.readFileSync(target.css, 'utf8');
  assert.match(css, /\.title\.svelte-1vwr9dd \.month\.svelte-1vwr9dd \{\s*color: var\(--text-normal\);/);
  assert.match(css, /\.title\.svelte-1vwr9dd \.year\.svelte-1vwr9dd \{\s*color: var\(--interactive-accent\);/);
}
console.log(`Calendar regression checks passed: ${targets.length} variants, legacy and fallback, ${scenarios.length} date scenarios each.`);
