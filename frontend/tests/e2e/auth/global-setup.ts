import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));

/** Repository root, relative to this file (frontend/tests/e2e/auth/global-setup.ts). */
export const REPO_ROOT = resolve(currentDir, "../../../..");

/** Path to the storage state that the authenticated Playwright project reuses. */
export const STORAGE_STATE_PATH = resolve(currentDir, "storageState.json");

/** Path to the backend script that seeds the session into the Redis auth store. */
const SEED_SCRIPT_PATH = resolve(REPO_ROOT, "backend_py/primary/scripts/seed_e2e_session.py");

/** The app host the browser talks to. The session cookie is scoped to this domain. */
const APP_DOMAIN = process.env.E2E_APP_DOMAIN ?? "localhost";

/**
 * Command used to run the seed script inside the backend container. Overridable via the
 * E2E_SEED_EXEC env var (whitespace separated) so CI or alternative setups can adapt it.
 * The backend script is piped to the command's stdin, so the command must end with `python -`
 * (or an equivalent that reads a script from stdin).
 */
function getSeedExecCommand(): string[] {
    if (process.env.E2E_SEED_EXEC) {
        return process.env.E2E_SEED_EXEC.trim().split(/\s+/);
    }
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
            `Failed to run the e2e session seed command "${command}". ` +
                `Make sure the full stack is running (docker compose up) and the backend-primary ` +
                `service is reachable.\nUnderlying error: ${result.error.message}`,
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
    // Expire the cookie far in the future so it survives the whole test run.
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
                // The app sets the cookie as Secure in production, but the e2e tests run against
                // http://localhost, so we must allow the cookie to be sent over plain HTTP here.
                secure: false,
                sameSite: "Lax" as const,
            },
        ],
        origins: [],
    };

    mkdirSync(dirname(STORAGE_STATE_PATH), { recursive: true });
    writeFileSync(STORAGE_STATE_PATH, JSON.stringify(storageState, null, 2));
}

async function globalSetup(): Promise<void> {
    // Allow reusing an externally provided storage state (e.g. prepared by CI) instead of seeding.
    if (process.env.E2E_REUSE_STORAGE_STATE && existsSync(STORAGE_STATE_PATH)) {
        return;
    }

    const seedResult = seedSession();
    writeStorageState(seedResult);
}

export default globalSetup;
