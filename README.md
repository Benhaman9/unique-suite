# Unique Suite

Si estudias y quieres tener la universidad ordenada —clases, diario, horario, recordatorios y calendario— sin pelearte con tres plugins distintos, esto es para ti.

**Unique Suite** junta en una sola instalación lo que yo uso día a día: el sistema Unique (inicio, captura de clases, notas diarias, horario, recordatorios) y Unique Agenda (eventos con hora, vistas mes/semana, capas e importación ICS, incluido Google Calendar). Está pensado para semestres, carpetas de cursos y un vault que se entiende solo.

En la práctica abres el inicio, capturas una clase, miras el horario, anotas recordatorios y ves la agenda con lo local y lo que viene de Google. Las capas te dejan mostrar u ocultar horario, eventos locales y cada feed ICS sin mezclarlo todo.

> **Importante:** no lo instales junto a los plugins separados `unique` y `unique-agenda`. Duplicarías vistas, comandos y cintas. Unique Suite los reemplaza.

**Autor:** Benjamín Alcalde · **Plugin id:** `unique-suite`

---

## Instalación

### Desde Plugins comunitarios (recomendado)

1. Ajustes → Plugins comunitarios → Explorar.
2. Busca **Unique Suite**.
3. Instalar → Activar.

### Desde GitHub (manual)

Si prefieres instalar a mano desde los [releases](https://github.com/Benhaman9/unique-suite/releases):

1. Crea la carpeta `<bóveda>/.obsidian/plugins/unique-suite/`.
2. Baja del release solo `main.js`, `manifest.json` y `styles.css` (Obsidian no usa el resto del repo).
3. Activa **Unique Suite** en Plugins comunitarios.
4. Recarga Obsidian si hace falta.

El `main.js` ya trae Unique, Agenda y el calendario embebido. No hace falta copiar otros archivos del repositorio a la carpeta del plugin.

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

Si usas otros nombres, ajústalos en Ajustes → Unique / Unique Agenda. Por defecto Agenda mira: `Sistema/Agenda/Eventos`, `Sistema/Agenda/Historial.md`, `Sistema/Recordatorios.md` y `Diario`.

---

## Google Calendar (ICS) y capas

1. En Google Calendar → configuración del calendario → **Secret address in iCal format**.
2. Pega cada URL en Ajustes → Unique Agenda.
3. Activa **auto-sync** si quieres sync periódica mientras Obsidian está abierto.
4. O usa el comando **Importar desde Google Calendar** para un sync manual.

Las capas (horario, local, cada feed Google) se controlan desde la vista Agenda y/o desde los ajustes.

---

## Ajustes y migración

Unique Suite guarda un solo `data.json` con dos bloques:

```json
{
  "unique": { },
  "agenda": { }
}
```

Si vienes de los plugins separados, copia el contenido de cada `data.json` a su bloque correspondiente (sin secretos si vas a compartir la bóveda). El comando que antes era `unique-agenda:abrir` ahora es `unique-suite:abrir`.

El calendario de notas diarias se basa en Obsidian Calendar de Liam Cain (MIT). Ver `NOTICE`.

---

## Licencia

MIT © 2026 Benjamín Alcalde.
Incluye código basado en Obsidian Calendar de Liam Cain (MIT, 2021). Ver `LICENSE` y `NOTICE`.

---

## English (short)

Unique Suite is one Obsidian install for a university vault: home, class capture, daily notes, timetable, reminders, calendar/agenda, ICS feeds (e.g. Google Calendar), and layers.

**Install:** Settings → Community plugins → Browse → **Unique Suite** → Install → Enable. Or download `main.js`, `manifest.json`, and `styles.css` from [GitHub Releases](https://github.com/Benhaman9/unique-suite/releases) into `.obsidian/plugins/unique-suite/`.

Do **not** run it alongside the separate `unique` and `unique-agenda` plugins — Unique Suite replaces them.
