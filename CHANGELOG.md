# Changelog

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
