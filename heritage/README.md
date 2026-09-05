# Heritage

Unique Suite is a single community plugin that embeds:

- **Unique** (`src/unique-core.js`) — university home, class capture, daily notes, timetable, reminders.
- **Unique Agenda** (`src/unique-agenda-core.js`) — month/week agenda, timed events, ICS/Google layers.
- **Obsidian Calendar by Liam Cain** (`src/calendar-original.js`) — MIT, bundled calendar view. See `NOTICE`.

The live vault may still run the separate plugins `unique` and `unique-agenda`.
Do **not** enable Unique Suite in the same vault as those two.

Community installs only download `main.js`, `manifest.json`, and `styles.css`
from a GitHub release. The three source modules are bundled into that `main.js`.
