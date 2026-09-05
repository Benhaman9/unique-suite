# Contributing

Thanks for helping with Unique Suite.

## Setup

Run `npm install` then `npm run build`.
Build writes main.js and release copies.

## Guidelines

- Use loadData/saveData for plugin state (namespaces unique, agenda).
- Prefer scoped folder walks (Diario/, Semestres/, Sistema/) over whole-vault listing.
- Avoid CSS important flags; raise specificity instead.
- Update CHANGELOG.md for every tagged release.
- Do not commit secrets in data.json.

## Releases

1. Bump manifest.json, package.json, versions.json.
2. Add ## x.y.z to CHANGELOG.md.
3. Commit, push main, tag x.y.z for attested Actions release.
