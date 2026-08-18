# Testing in Webviz

## Installation

In order to run `e2e` or `component` tests, you might need to install the required browser executables for `Playwright`.

```bash
npx playwright install --with-deps
```

If this command does not work, try to install all dependencies manually:

```bash
sudo apt install libopenjp2-7 libflite1 gstreamer1.0-libav
```

## Unit tests

Unit tests are performed using `vitest`. All code (classes, functions, etc.) that is not depending on the GUI (i.e. all files that are not components or hooks) should be covered by a unit test.

### How to write unit tests

https://vitest.dev/guide/#writing-tests

### Where to place unit tests

All unit tests have to be placed in the `tests/unit/` folder.

### Additional information

A check for test coverage is automatically performed using `istanbul / nyc`. The results are written to `coverage/unit`.

## e2e tests

End-to-end tests are performed using `Playwright`. Each module author is encouraged to write one or more e2e tests for their respective module.

### How to write e2e tests

https://playwright.dev/docs/writing-tests

### Where to place e2e tests

All e2e tests have to be placed in the `tests/e2e/` folder.

### Additional information

You can run e2e tests in `ui` mode by running `npm run test:e2e:ui`.

You can also generate e2e test dynamically by using `Playwright`'s test generator.

Start the Webviz docker container on your local computer as usual and then run:

```bash
npx playwright codegen http://localhost:8080
```

Read more: https://playwright.dev/docs/codegen-intro

### Recording new stories with codegen (incl. GitHub Codespaces)

Stories live in `tests/e2e/stories/` and are recorded walkthroughs: they import `test` from
`support/recordingFixtures` and use the `support/walkthroughHelpers` (`smoothClick`, `narrate`,
pacing) so the same test doubles as a tutorial video when run with `RECORD=1`.

To author a new story starting from `codegen`:

1. Start the full docker stack (`docker compose up`) so the app is served on
   `http://localhost:8080` and the backend is available for session seeding.
2. In a Codespace, `codegen` needs a display for its headed browser. This repo's dev container
   ships the `desktop-lite` feature, which serves a lightweight desktop over the forwarded
   **port 6080** (noVNC) — open it in a browser tab to watch/drive the recorded browser.
3. Seed an authenticated session and launch codegen (it starts logged in via the seeded
   `storageState.json`):

   ```bash
   npm run test:e2e:codegen
   ```

   This runs `npm run test:e2e:seed` first (writes `tests/e2e/setup/storageState.json`) and then
   opens `playwright codegen`, saving the captured actions to `tests/e2e/stories/_recorded.gen.ts`
   (git-ignored). If you only need to refresh the session, run `npm run test:e2e:seed` on its own.
4. Copy `tests/e2e/stories/_story.template.ts` to `<yourStory>.test.ts` and port the captured
   selectors/actions into it, wrapping interactions in `smoothClick`/`smoothFill` and adding
   `narrate(...)` lines. `codegen` emits plain Playwright calls, so this adaptation is manual.
5. Verify with `npm run test:e2e` (fast regression run) or `npm run test:e2e:record` (produces the
   narrated video).


## Component tests

Component tests are performed using `Playwright`. Each author of a generic component (i.e. placed in the `src/lib/components/` folder) is encouraged to write one or more component tests for their respective component.

### How to write component tests

https://playwright.dev/docs/test-components

### Where to place component tests

All component tests have to be placed in the `tests/ct/` folder.

### Additional information

Unfortunately, `Playwright` does not yet provide `coverage` for component tests. However, it would be beneficial to check how many components actually do have a related test such that we can improve our code base. This is a feature that should be implemented as soon as it becomes easier available.
