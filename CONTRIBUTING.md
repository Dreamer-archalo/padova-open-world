# Contributions and publication

## Pull Request destination

Open new work against **Dreamer-archalo/padova-open-world**, base branch **main**:
https://github.com/Dreamer-archalo/padova-open-world/compare

This repository is a fork. GitHub can preselect the upstream repository when opening a cross-fork comparison: explicitly select `Dreamer-archalo/padova-open-world` as the base repository for this edition.

Start feature branches from this repository's current `main`, preserve existing game modes and saves unless the task explicitly changes them, and describe the behavior changed and the tests performed. Existing checks are `npm test` and `npm run test:modern`.

## Public Site

https://padova-open-world.tfyudartuuyikgfdsgafrdyu.chatgpt.site

The hosting identity in `.openai/hosting.json` belongs to this edition. Preserve it to update the same public URL. Do not copy a hosting identity from upstream or from a private preview.

The entire application is the tracked `dist/` directory: deploy its contents exactly, including the JavaScript modules, CSS, data and vendor assets. No application build is required. Keep map and third-party credits.

## Publication flow

1. Review and merge changes into `Dreamer-archalo/padova-open-world:main`.
2. Request publication of that repository's current `main` to this Site.
3. The publishing agent checks out that revision, validates the static assets, pushes the same source revision to the Site's managed source repository, packages `dist/`, and publishes the saved version.
4. Confirm that deployment succeeded and retain the same public URL.

GitHub remains the source of truth. The Sites managed source repository is the publication copy. No automatic deployment on merge and no GitHub Actions workflow are configured by this setup. A future publication should use the Site's existing public audience.
