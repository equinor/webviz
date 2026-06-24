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

The e2e suite is split into two Playwright projects:

- **`unauthenticated-chromium`** – tests that run without a logged-in session (e.g. the sign-in
  redirect in `signIn.test.ts`). Place additional unauthenticated tests in `tests/e2e/` and name
  them `*.unauth.test.ts`.
- **`authenticated-chromium`** – tests in `tests/e2e/authed/` that run with a seeded, logged-in
  session and fetch real data from Sumo.

### How to write e2e tests

https://playwright.dev/docs/writing-tests

### Where to place e2e tests

All e2e tests have to be placed in the `tests/e2e/` folder (authenticated ones under
`tests/e2e/authed/`).

### Authenticated tests (Sumo auth bypass)

Authenticated tests avoid interactive Microsoft sign-in by seeding a server-side session whose
Sumo access token is the sentinel `DUMMY_TOKEN_FOR_TESTING`. The backend's `create_sumo_client()`
recognises that sentinel and authenticates to Sumo using the on-disk **shared key**
(`~/.sumo/<id>.sharedkey`) – the same mechanism used by the backend integration tests. This lets
the frontend behave as a logged-in user reading real Drogon data without any OAuth flow.

The seeding is done by Playwright's global setup (`tests/e2e/auth/global-setup.ts`), which runs
`backend_py/primary/scripts/seed_e2e_session.py` inside the running `backend-primary` container and
writes a `storageState.json` cookie file that the authenticated project reuses.

Prerequisites to run the authenticated tests locally:

1. Start the full stack so the frontend (`http://localhost:8080`), backend and Redis are running:

   ```bash
   docker compose up
   ```

2. Make sure the Sumo shared key is present inside the `backend-primary` container at
   `~/.sumo/9e5443dd-3431-4690-9617-31eed61cb55a.sharedkey` and that `WEBVIZ_SUMO_ENV=prod`.
   (This is the same key used by the `backend_sumo_prod.yml` workflow.)

3. Run the tests:

   ```bash
   npm run test:e2e
   ```

The command used to seed the session can be overridden with the `E2E_SEED_EXEC` env var (whitespace
separated, must end in a `python -`-style command that reads the script from stdin), and the app
base URL with `E2E_BASE_URL`.

> Note: Only Sumo-backed data works through this bypass. Flows that need other services (e.g. SMDA
> well data) are not covered, since no shared key is provided for them.

### Recording video and screenshots

Set `RECORD=1` to capture a video and screenshots for every test (e.g. to later upload to blob
storage). Artifacts are written to `frontend/test-results/`.

```bash
npm run test:e2e:record
```

### Additional information

You can run e2e tests in `ui` mode by running `npm run test:e2e:ui`.

You can also generate e2e test dynamically by using `Playwright`'s test generator.

Start the Webviz docker container on your local computer as usual and then run:

```bash
npx playwright codegen http://localhost:8080
```

Read more: https://playwright.dev/docs/codegen-intro

## Component tests

Component tests are performed using `Playwright`. Each author of a generic component (i.e. placed in the `src/lib/components/` folder) is encouraged to write one or more component tests for their respective component.

### How to write component tests

https://playwright.dev/docs/test-components

### Where to place component tests

All component tests have to be placed in the `tests/ct/` folder.

### Additional information

Unfortunately, `Playwright` does not yet provide `coverage` for component tests. However, it would be beneficial to check how many components actually do have a related test such that we can improve our code base. This is a feature that should be implemented as soon as it becomes easier available.
