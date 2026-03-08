# ACCEPTANCE: Hopium Theme Swatch Refresh

- Change ID: `CHG-0012`

## Functional Acceptance

- [x] Hopium dark theme uses the provided swatch direction (`#025159`, `#04BFBF`, `#038C8C`, `#BF9A78`, `#8C452B`) across core surfaces and accents.
- [x] Hopium light theme has explicit family overrides for surfaces, borders, text hierarchy, charts, and state colors.
- [x] Brown shades dominate Hopium backgrounds/surfaces; blue tones are reserved for accents and interactive emphasis.
- [x] Theme IDs remain stable (`hopium` family with light/dark variants) for snapshot/bookmark compatibility.

## Regression Gate

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm test -w @finapp/server -- tests/routes/themes.test.ts`

## Closure Checklist

- [x] Root `TASKS.md` updated with `CHG-0012`
- [x] `PROGRESS.txt` includes completion summary with `CHG-0012`
- [x] Canonical docs updated if required by scope (not required for this change)
