import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));

/** Repository root, relative to this file (frontend/tests/e2e/setup/globalSetup.ts). */
export const REPO_ROOT = resolve(currentDir, "../../../..");

/** Path to the storage state that the authenticated Playwright project reuses. */
export const STORAGE_STATE_PATH = resolve(currentDir, "storageState.json");

/** Path to the backend script that seeds the session into the Redis auth store. */
const SEED_SCRIPT_PATH = resolve(REPO_ROOT, "backend_py/primary/scripts/seed_e2e_session.py");

/** Sumo application id whose shared key the backend expects (filename is "<app-id>.sharedkey"). */
const SUMO_APP_ID = "9e5443dd-3431-4690-9617-31eed61cb55a";

/** Directory (inside the backend container) where the backend reads the Sumo shared key. */
const SUMO_KEY_DIR = "/home/appuser/.sumo";

/** Full path (inside the backend container) of the Sumo shared key file. */
const SUMO_KEY_PATH = `${SUMO_KEY_DIR}/${SUMO_APP_ID}.sharedkey`;

/** Env var holding the Sumo prod shared key (e.g. a Codespace secret). */
const SUMO_SHARED_KEY_ENV_VAR = "SHARED_KEY_DROGON_READ_PROD";

/** The app host the browser talks to. The session cookie is scoped to this domain. */
const APP_DOMAIN = "localhost";

/** The app origin the browser loads, used to scope seeded localStorage entries. */
const APP_ORIGIN = "http://localhost:8080";

/** Base `docker compose` command (with the repo compose file) that container commands are run on. */
function getComposeBaseCommand(): string[] {
    return ["docker", "compose", "-f", resolve(REPO_ROOT, "docker-compose.yml")];
}

/**
 * Command used to run the seed script inside the backend container. The backend script is piped to
 * the command's stdin, so it ends with `python -` (which reads the script from stdin).
 */
function getSeedExecCommand(): string[] {
    return [...getComposeBaseCommand(), "exec", "-T", "backend-primary", "python", "-"];
}

/** Run a `docker compose exec -T <args>` command, optionally piping `input` to its stdin. */
function runComposeExec(args: string[], input?: string): void {
    const [command, ...baseArgs] = getComposeBaseCommand();
    const result = spawnSync(command, [...baseArgs, "exec", "-T", ...args], {
        input,
        encoding: "utf-8",
    });

    if (result.error) {
        throw new Error(
            `Failed to run "docker compose exec ${args.join(" ")}".\nUnderlying error: ${result.error.message}`,
        );
    }

    if (result.status !== 0) {
        throw new Error(
            `"docker compose exec ${args.join(" ")}" exited with code ${result.status}.\n` +
                `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
        );
    }
}

/**
 * Install the Sumo shared key into the running backend container so e2e/codegen sessions can fetch
 * real Sumo data. The install is idempotent (it just rewrites the same key file), so it's run on
 * every setup; the key only persists for the life of the container, so seeding right after a fresh
 * `docker compose up` would otherwise fetch no Sumo data.
 */
function installSumoSharedKey(): void {
    const sharedKey = process.env[SUMO_SHARED_KEY_ENV_VAR];
    if (!sharedKey) {
        throw new Error(
            `Environment variable '${SUMO_SHARED_KEY_ENV_VAR}' is empty or unset. ` +
                `Set it (e.g. as a Codespace secret) to the Sumo prod shared key and re-run.`,
        );
    }

    // Pipe the key straight into a file inside the container so it never touches the host disk, then
    // make the backend user (appuser) its sole owner with read-only access.
    runComposeExec(["backend-primary", "mkdir", "-p", SUMO_KEY_DIR]);
    runComposeExec(["backend-primary", "sh", "-c", `cat > '${SUMO_KEY_PATH}'`], sharedKey);
    runComposeExec(["-u", "root", "backend-primary", "chown", "appuser:appuser", SUMO_KEY_PATH]);
    runComposeExec(["-u", "root", "backend-primary", "chmod", "600", SUMO_KEY_PATH]);
}

type SeedResult = {
    cookieName: string;
    sessionId: string;
    sumoToken: string;
};

function seedSession(): SeedResult {
    if (!existsSync(SEED_SCRIPT_PATH)) {
        throw new Error(`Seed script not found at ${SEED_SCRIPT_PATH}`);
    }

    const scriptSource = readFileSync(SEED_SCRIPT_PATH, "utf-8");
    const [command, ...args] = getSeedExecCommand();

    const result = spawnSync(command, args, {
        input: scriptSource,
        encoding: "utf-8",
    });

    if (result.error) {
        throw new Error(
            `Failed to run the e2e session seed command "${command}".` + `\nUnderlying error: ${result.error.message}`,
        );
    }

    if (result.status !== 0) {
        throw new Error(
            `The e2e session seed command exited with code ${result.status}.\n` +
                `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
        );
    }

    // The script prints a single JSON line to stdout; everything else goes to stderr.
    const lastJsonLine = result.stdout
        .split("\n")
        .map((line: string) => line.trim())
        .filter((line: string) => line.startsWith("{"))
        .at(-1);

    if (!lastJsonLine) {
        throw new Error(`Could not find JSON result in seed script output.\nstdout:\n${result.stdout}`);
    }

    return JSON.parse(lastJsonLine) as SeedResult;
}

function writeStorageState(seedResult: SeedResult): void {
    const expires = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;

    const storageState = {
        cookies: [
            {
                name: seedResult.cookieName,
                value: seedResult.sessionId,
                domain: APP_DOMAIN,
                path: "/",
                expires,
                httpOnly: true,
                sameSite: "Lax" as const,
            },
        ],
        origins: [
            {
                origin: APP_ORIGIN,
                localStorage: [
                    { name: "webvizDebug_forceToggleDevModeTo", value: "false" },
                ],
            },
        ],
    };

    mkdirSync(dirname(STORAGE_STATE_PATH), { recursive: true });
    writeFileSync(STORAGE_STATE_PATH, JSON.stringify(storageState, null, 2));
}

async function globalSetup(): Promise<void> {
    installSumoSharedKey();
    const seedResult = seedSession();
    writeStorageState(seedResult);
}

export default globalSetup;

// Run directly (`node tests/e2e/setup/globalSetup.ts`) to seed a session so `playwright codegen` starts logged in.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    await globalSetup();
    console.info(`Wrote authenticated storage state to ${STORAGE_STATE_PATH}`);
}
