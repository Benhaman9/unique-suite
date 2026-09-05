# Changelog

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
