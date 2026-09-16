# Padova After Hours — release 1.2

## Source of truth

- Canonical repository: `Dreamer-archalo/padova-open-world`.
- Production branch and only integration target: `main`.
- Fixed source starting point for consolidation: `bf51b9fc3a0eb8701628ae733e37f129e7dc9326` (16 September 2026); the completed release snapshot is the `release/v1.2` branch created after merging this preparation PR.
- The entire deployable game is the committed `dist/` directory. Never deploy only some of its modules or mix artifacts from different commits.
- Version identity: `dist/version.json`, available at `/version.json` on the production site.
- Intended single official URL: `https://padova-open-world.netlify.app/` (existing project ID `5dffd0e1-0188-4bb1-a165-4d1fc3242c0c`).
- GitHub Pages mirror: `https://dreamer-archalo.github.io/padova-open-world/`, automatically deployed from this repository's `main` by `.github/workflows/github-pages.yml`.
- Historical `scandolo/padova-open-world` and the `iridescent-starburst-ecc8af` Netlify site are NOT release sources. ChatGPT Sites is a separate hosting system.

## What is included

The snapshot starts from all changes already merged or committed directly on canonical `main` as of the base commit, including the latest Taxi fixes, two Tangenziale races, updated online race lobby and second-race positioning fix, rooftop easter egg, visual/map improvements and existing city/gameplay upgrades. These are *source inclusions*, not guarantees that every feature passed manual WebGL tests.

The draft PR #13 and divergent work branches are excluded until individually rebased, tested and merged. Unimplemented requests (UFO, relocating the villa, mercenaries, drivable boats) are not claimed as release features. Known geometry/terrain issues remain subject to regression tests and on-device validation.

## Make GitHub and the existing Netlify site share one release

A repository commit or successful GitHub Pages deploy DOES NOT update Netlify until that existing Netlify project is linked to the same repository. The currently observed Netlify production deployment was `147d5d9975d78f5ce9b2285d1999c0a81ebf468c` (PR #15), loaded via API.

One-time account-owner action (no new site): open `https://app.netlify.com/projects/padova-open-world`, then **Project configuration → Build & deploy → Continuous deployment → Repository → Link repository** (or manage/change the linked repository, if any). Authorize Netlify's GitHub integration for `Dreamer-archalo/padova-open-world`, select branch `main`, publish folder `dist`, and retain the existing project/domain. If asked for a build command, the repository's `netlify.toml` supplies it. Never choose *Push to new repository* or create another Netlify project.

Both hosting pipelines must validate the Taxi and Tangenziale suites plus online-race regressions before publishing. Netlify reads `netlify.toml` and GitHub Pages runs `.github/workflows/github-pages.yml`.

## Acceptance criteria for a finished 1.2 release

1. `main` contains this release configuration and the source snapshot `release/v1.2` points to that exact commit.
2. GitHub Pages deploy shows `conclusion: success`, head commit equal to the chosen source commit, and `/version.json` reports `1.2.0`.
3. Existing Netlify production deploy shows `state: ready`, `commit_ref` equal to that same commit, and `/version.json` reports `1.2.0`.
4. Run an actual WebGL smoke test on the official URL: initial loader, car entry, one full Taxi ride including payment and exit, both Tangenziale races including finish/abort/respawn, and two-device online join/start/finish. These interactive checks cannot be inferred from syntax tests alone.
5. Only after steps 1–4 can we call the official Netlify website *version 1.2 published and verified*. Until then the code may be prepared, but the two live deployments are not yet synchronized.

## Future updates

Create short PRs against the canonical `main`; merge only tested and independent changes. For every deploy, check the exact source SHA in the GitHub Pages run and in the Netlify production deployment, not merely an HTTP 200 or a green build. Keep the `release/v1.2` snapshot untouched for a rollback reference. Subsequent releases should increment `dist/version.json` intentionally and document excluded/outstanding work; never edit the old upstream, mirror, or legacy Sites as a parallel source.
