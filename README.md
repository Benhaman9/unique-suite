# Unique Suite

**Plugin id:** `unique-suite`  
**Version:** 0.1.0  
**Author:** Benjamín Alcalde

Un plugin de Obsidian que une en **una sola instalación** el sistema universitario Unique y Unique Agenda.

An Obsidian community plugin that combines Unique (university home, class capture, daily notes, timetable, reminders) and Unique Agenda (calendar, timed events, ICS feeds, layers) in one install.

> **No lo uses junto a los plugins separados `unique` y `unique-agenda`.** Duplicaría vistas, comandos y cintas. Este suite los reemplaza.

---

## Qué hace / What it does

1. **Unique** — inicio personalizado, captura de clases, diario, horario, recordatorios, panel de control, calendario de notas diarias.
2. **Unique Agenda** — eventos con hora, vistas mes/semana, capas (horario / local / Google), importación ICS y sync automático.

El calendario de notas diarias está basado en Obsidian Calendar de Liam Cain (MIT). Ver `NOTICE`.

---

## Instalación (Community / GitHub)

Cuando el plugin esté en el directorio comunitario de Obsidian:

1. Ajustes → Plugins comunitarios → Explorar → **Unique Suite**.
2. Instalar y activar.

Instalación manual desde un release de GitHub (https://github.com/Benhaman9/unique-suite):

1. Crea la carpeta `<bóveda>/.obsidian/plugins/unique-suite/`.
2. Descarga del release **solo** estos archivos (Obsidian community no instala el resto del repo):
   - `main.js`
   - `manifest.json`
   - `styles.css`
3. Ajustes → Plugins comunitarios → activa **Unique Suite**.
4. Recarga Obsidian si hace falta.

`main.js` ya incluye Unique, Agenda y el calendario original. No copies `unique-core.js` ni `calendar-original.js` a la carpeta del plugin.

---

## Preparar la bóveda

El sistema espera (aprox.) estas carpetas/notas. Puedes crearlas a mano o usar el comando **Preparar bóveda universitaria**:

| Ruta | Uso |
|------|-----|
| `Diario/` | Notas diarias (`Diario/YYYY-MM/YYYY-MM-DD.md`) |
| `Semestres/` | Cursos y apuntes por semestre |
| `Sistema/` | Infraestructura del sistema |
| `Sistema/Agenda/Eventos/` | Notas de eventos de la agenda |
| `Sistema/Agenda/Historial.md` | Historial de acciones de agenda |
| `Sistema/Recordatorios.md` | Tabla de recordatorios |
| `Horario` (nota con `tipo: horario`, `estado: activo`) | Bloques de horario (solo lectura en Agenda) |

Ajusta las rutas en Ajustes → Unique / Unique Agenda si usas otros nombres. Por defecto Agenda usa:

- Eventos: `Sistema/Agenda/Eventos`
- Historial: `Sistema/Agenda/Historial.md`
- Recordatorios: `Sistema/Recordatorios.md`
- Diario: `Diario`

---

## Google Calendar (ICS) y capas

1. En Google Calendar → configuración del calendario → **Secret address in iCal format**.
2. Pega cada URL en Ajustes → Unique Agenda (Clases / Oficial / Espiritual / Otros).
3. Activa **auto-sync** si quieres sincronización periódica mientras Obsidian está abierto.
4. Comando **Importar desde Google Calendar** para un sync manual.

Las capas (mostrar/ocultar horario, local, cada feed Google) se controlan desde la vista Agenda y/o ajustes.

**No subas** `data.json` con URLs secretas ICS ni tokens a un repositorio público. Usa `data.json.example` como plantilla. Ese archivo **no** se instala desde el community release.

---

## Settings namespaced

Unique Suite guarda un solo `data.json` con dos bloques:

```json
{
  "unique": { },
  "agenda": { }
}
```

Si migras desde los plugins separados, copia el contenido de cada `data.json` vivo a su bloque (sin secretos si vas a compartir).

---

## Relación con Unique y Unique Agenda

| Plugin | Rol |
|--------|-----|
| `unique` + `unique-agenda` | Plugins internos separados (bóveda live). No usar junto al suite. |
| **unique-suite** | Este plugin. Instalación única para community / otro dispositivo. |

The in-app command that used to call `unique-agenda:abrir` now calls `unique-suite:abrir`.

---

## Desarrollo

Instala dependencias y genera el bundle con el script `package.json` (`build`).
Eso escribe `main.js` (bundle único) y copia `main.js`, `manifest.json` y `styles.css` a `release/` para subirlos al GitHub Release.

Requisito comunitario: Obsidian solo descarga esos tres archivos del release. El orquestador y los cores viven en `src/` y se empaquetan en `main.js`.

---

## Licencia

MIT © 2026 Benjamín Alcalde.
Incluye código basado en Obsidian Calendar de Liam Cain (MIT, 2021). Ver `LICENSE` y `NOTICE`.
