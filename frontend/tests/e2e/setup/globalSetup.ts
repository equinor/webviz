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

/** The app host the browser talks to. The session cookie is scoped to this domain. */
const APP_DOMAIN = "localhost";

/** The app origin the browser loads, used to scope seeded localStorage entries. */
const APP_ORIGIN = "http://localhost:8080";

/**
 * Command used to run the seed script inside the backend container. The backend script is piped to
 * the command's stdin, so it ends with `python -` (which reads the script from stdin).
 */
function getSeedExecCommand(): string[] {
    return [
        "docker",
        "compose",
        "-f",
        resolve(REPO_ROOT, "docker-compose.yml"),
        "exec",
        "-T",
        "backend-primary",
        "python",
        "-",
    ];
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
            `Failed to run the e2e session seed command "${command}".` +
            `\nUnderlying error: ${result.error.message}`,
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
                    // Hide dev tools in playwright tests.
                    { name: "devToolsVisible", value: "false" },
                    { name: "lastSeenChangelog", value: "99" },
                ],
            },
        ],
    };

    mkdirSync(dirname(STORAGE_STATE_PATH), { recursive: true });
    writeFileSync(STORAGE_STATE_PATH, JSON.stringify(storageState, null, 2));
}

async function globalSetup(): Promise<void> {
    const seedResult = seedSession();
    writeStorageState(seedResult);
}

export default globalSetup;
