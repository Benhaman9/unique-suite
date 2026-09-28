# Changelog

## 0.2.5

- **Biblioteca de atajos:** corrige el ancho y el espaciado del modal para evitar texto pegado a los bordes y desplazamiento horizontal.
- **Presentación:** muestra las combinaciones de teclas debajo de cada comando con el color de acento de Obsidian.
- **Cierre:** alinea la cruz con márgenes superior y derecho simétricos, incluyendo pantallas pequeñas.

## 0.2.4

- **Biblioteca de atajos:** añade un panel buscable con todos los comandos de Unique Suite y los atajos asignados actualmente en Obsidian.
- **Acceso rápido:** la biblioteca se abre desde Inicio, desde el panel de ajustes o mediante el comando **Abrir biblioteca de atajos**.
- **Configuración:** incluye un acceso directo a la sección de atajos de Obsidian y adapta su interfaz a español o inglés.

## 0.2.3

- **Captura rápida:** el botón de Inicio crea y abre una nota propia en `01 Inbox`, con propiedades de captura rápida y sin requerir un apunte abierto.
- **Procesamiento:** añade el comando **Enviar captura rápida a un ramo**, que permite elegir un ramo, completa sus propiedades académicas y mueve la nota a la carpeta correspondiente.
- **Compatibilidad:** conserva la clasificación de las capturas antiguas almacenadas en `Sistema/Capturas rápidas`.

## 0.2.2

- **Internationalization:** translates the daily-note confirmation message, action buttons, and date format according to the selected Unique Suite language.

## 0.2.1

- **Home search:** ensures the highest-ranked result is selected immediately, makes the selection visibly distinct, and keeps it synchronized while navigating with Up/Down in both Home implementations.

## 0.2.0

- **Internationalization:** adds a central English/Spanish catalog for Unique Suite, including settings, dialogs, notices, generated document content, calendar UI, and display-only vault paths.
- **University workflow:** adds the language setting, a guided first-run note, mandatory course and professor names, translated generated documents, and a standalone Quick Captures inbox with a Home filter.
- **Agenda:** replaces personal calendar presets with unlimited Google/Outlook ICS subscriptions, one external layer, safer localized path resolution, and a direct Home-to-Agenda action.
- **Home search:** adds ranked keyboard navigation with Up/Down, Enter to open, and a visible selected result.
- **Presentation:** replaces visible automatic-index markers with hidden HTML comments while preserving existing notes.

## 0.1.5

- **Manifest:** publica la descripción corregida, sin la palabra redundante "Obsidian", para volver a ejecutar la revisión automática de Plugins comunitarios.
- **Packaging:** sincroniza las versiones de `package.json` y `package-lock.json` con el manifiesto.

## 0.1.4

- **Docs:** README reescrito para quien instala desde Plugins comunitarios (instalación comunitaria primero; sin notas de revisión ni asides de desarrollo).

## 0.1.3

- **Docs:** README reescrito en voz natural (español primero) para quien evalúa instalar el plugin; blurb corto en inglés.
- **manifest:** descripción comunitaria más clara y alineada al tono del README.

## 0.1.2

Community review hardening and release hygiene:

- **Release notes:** GitHub Releases now include a non-empty body (this CHANGELOG section).
- **Vault enumeration:** replaced whole-vault markdown listing with scoped folder iteration under Diario/, Semestres/, and Sistema/ (home search/recents, calendar day stats, semester helpers, agenda events/horario). User-triggered home search still enumerates those folders only — reviewers may still note scoped enumeration.
- **Local storage:** calendar locale no longer reads browser storage; uses Obsidian getLanguage() when available, else navigator.language. Plugin prefs remain on loadData/saveData (namespaced unique / agenda).
- **CSS:** removed all important flags from styles.css; raised selector specificity where needed.
- **Docs:** added short CONTRIBUTING.md.

## 0.1.1

- Attested GitHub Actions release workflow (actions/attest-build-provenance).
- Bundle Unique + Unique Agenda + Calendar heritage into a single community plugin.

## 0.1.0

- Initial Unique Suite packaging for community review.
