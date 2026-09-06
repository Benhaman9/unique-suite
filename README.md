# Unique Suite

Si estudias y quieres tener la universidad ordenada en Obsidian —clases, diario, horario, recordatorios y calendario— sin pelearte con tres plugins distintos, esto es para ti.

**Unique Suite** junta en una sola instalación lo que yo uso en la bóveda: el sistema Unique (inicio, captura de clases, notas diarias, horario, recordatorios) y Unique Agenda (eventos con hora, vistas mes/semana, capas e importación ICS, incluido Google Calendar). Pensado para semestres, carpetas de cursos y un vault que se entiende solo.

Día a día: abres el inicio, capturas una clase, miras el horario, anotas recordatorios y ves la agenda con lo local y lo que viene de Google. Las capas te dejan mostrar u ocultar horario, eventos locales y cada feed ICS sin mezclarlo todo.

> **Importante:** no lo instales junto a los plugins separados `unique` y `unique-agenda`. Duplicarías vistas, comandos y cintas. El suite los reemplaza.

**Plugin id:** `unique-suite` · **Versión:** 0.1.3 · **Autor:** Benjamín Alcalde

---

## English (short)

Unique Suite is one Obsidian install for a university vault: home, class capture, daily notes, timetable, reminders, calendar/agenda, ICS feeds (e.g. Google Calendar), and layers. Do **not** run it alongside separate `unique` + `unique-agenda` plugins.

---

## Instalación

**Desde Community Plugins** (cuando esté aprobado):

1. Ajustes → Plugins comunitarios → Explorar → busca **Unique Suite**.
2. Instalar → Activar.

**Desde GitHub** ([releases](https://github.com/Benhaman9/unique-suite/releases)):

1. Crea `<bóveda>/.obsidian/plugins/unique-suite/`.
2. Baja del release solo `main.js`, `manifest.json` y `styles.css` (Obsidian no instala el resto del repo).
3. Activa **Unique Suite** en Plugins comunitarios.
4. Recarga Obsidian si hace falta.

`main.js` ya trae Unique, Agenda y el calendario embebido. No copies `unique-core.js` ni `calendar-original.js` a la carpeta del plugin.

---

## Preparar la bóveda

Puedes crear las carpetas a mano o usar el comando **Preparar bóveda universitaria**. Estructura aproximada:

| Ruta | Uso |
|------|-----|
| `Diario/` | Notas diarias (`Diario/YYYY-MM/YYYY-MM-DD.md`) |
| `Semestres/` | Cursos y apuntes por semestre |
| `Sistema/` | Infra del sistema |
| `Sistema/Agenda/Eventos/` | Notas de eventos |
| `Sistema/Agenda/Historial.md` | Historial de agenda |
| `Sistema/Recordatorios.md` | Tabla de recordatorios |
| Nota `Horario` (`tipo: horario`, `estado: activo`) | Bloques de horario (solo lectura en Agenda) |

Si usas otros nombres, ajústalos en Ajustes → Unique / Unique Agenda. Por defecto Agenda mira: `Sistema/Agenda/Eventos`, `Sistema/Agenda/Historial.md`, `Sistema/Recordatorios.md`, `Diario`.

---

## Google Calendar (ICS) y capas

1. En Google Calendar → configuración del calendario → **Secret address in iCal format**.
2. Pega cada URL en Ajustes → Unique Agenda (Clases / Oficial / Espiritual / Otros).
3. Activa **auto-sync** si quieres sync periódica mientras Obsidian está abierto.
4. O usa el comando **Importar desde Google Calendar** para un sync manual.

Las capas (horario, local, cada feed Google) se controlan desde la vista Agenda y/o ajustes.

**No subas** `data.json` con URLs secretas ICS ni tokens a un repo público. Usa `data.json.example` como plantilla; ese archivo no viene en el release comunitario.

---

## Ajustes y migración

Unique Suite guarda un solo `data.json` con dos bloques:

```json
{
  "unique": { },
  "agenda": { }
}
```

Si vienes de los plugins separados, copia cada `data.json` vivo a su bloque (sin secretos si vas a compartir). El comando que antes llamaba `unique-agenda:abrir` ahora es `unique-suite:abrir`.

| Plugin | Rol |
|--------|-----|
| `unique` + `unique-agenda` | Separados (bóveda live). No usar junto al suite. |
| **unique-suite** | Esta instalación única para community / otro dispositivo. |

El calendario de notas diarias se basa en Obsidian Calendar de Liam Cain (MIT). Ver `NOTICE`.

---

## Desarrollo

Instala dependencias y corre el script `build` de `package.json`. Eso escribe `main.js` (bundle único) y copia `main.js`, `manifest.json` y `styles.css` a `release/` para el GitHub Release.

Obsidian community solo descarga esos tres archivos; el orquestador y los cores viven en `src/`.

---

## Licencia

MIT © 2026 Benjamín Alcalde.
Incluye código basado en Obsidian Calendar de Liam Cain (MIT, 2021). Ver `LICENSE` y `NOTICE`.
