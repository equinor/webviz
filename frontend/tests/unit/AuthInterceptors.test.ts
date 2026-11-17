import { QueryClient } from "@tanstack/query-core";
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import axios, { AxiosError, isAxiosError, isCancel } from "axios";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { getSessionMetadataOptions, postRefreshFingerprintsForEnsemblesOptions } from "@api";
import { createClient } from "@api/client";
import { installAuthInterceptors, SKIP_AUTH_GUARD_META } from "@framework/internal/auth/authInterceptors";

const BASE_URL = "http://test.local";
const SESSION_METADATA_PATH = "/persistence/sessions/metadata/session-1";
const REFRESH_FINGERPRINTS_PATH = "/ensembles/refresh_fingerprints";

/**
 * Minimal stand-in for the backend: answers the two endpoints the workbench polls in the background,
 * and responds with 401 to everything once the token has "expired".
 */
function makeMockBackend() {
    const requestedPaths: string[] = [];
    let tokenExpired = false;
    let forcedStatus: number | null = null;

    const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
        const path = new URL(axios.getUri(config)).pathname;
        requestedPaths.push(path);

        let status = 200;
        let data: unknown = null;
        if (tokenExpired) {
            status = 401;
            data = { detail: "Not authenticated" };
        } else if (forcedStatus !== null) {
            status = forcedStatus;
        } else if (path === SESSION_METADATA_PATH) {
            data = { id: "session-1", updatedAt: "2026-01-01T00:00:00Z" };
        } else if (path === REFRESH_FINGERPRINTS_PATH) {
            data = ["fingerprint-1"];
        } else {
            status = 404;
        }

        const response: AxiosResponse = { status, statusText: String(status), data, headers: {}, config, request: {} };
        if (status >= 400) {
            throw new AxiosError("Request failed", AxiosError.ERR_BAD_REQUEST, config, {}, response);
        }
        return response;
    };

    return {
        adapter,
        requestedPaths,
        expireToken: () => (tokenExpired = true),
        respondWith: (status: number | null) => (forcedStatus = status),
    };
}

describe("installAuthInterceptors", () => {
    let backend: ReturnType<typeof makeMockBackend>;
    let client: ReturnType<typeof createClient>;
    let queryClient: QueryClient;
    let isLoggedIn: boolean;
    let onUnauthorized: ReturnType<typeof vi.fn<() => void>>;
    let eject: () => void;

    // Mirrors how the workbench polls in the background (BackendSyncManager, fetchEnsembleFingerprints)
    function pollSessionMetadata() {
        return queryClient.fetchQuery({
            ...getSessionMetadataOptions({ client, path: { session_id: "session-1" } }),
            staleTime: 0,
        });
    }

    function pollFingerprints() {
        return queryClient.fetchQuery({
            ...postRefreshFingerprintsForEnsemblesOptions({
                client,
                body: [{ caseUuid: "case-1", ensembleName: "iter-0" }],
            }),
            staleTime: 0,
        });
    }

    async function captureError(promise: Promise<unknown>): Promise<unknown> {
        try {
            await promise;
        } catch (error) {
            return error;
        }
        throw new Error("Expected the request to fail");
    }

    beforeEach(() => {
        backend = makeMockBackend();
        client = createClient({ baseURL: BASE_URL, axios: axios.create({ adapter: backend.adapter }) });
        queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

        isLoggedIn = true;
        onUnauthorized = vi.fn(() => {
            isLoggedIn = false;
        });
        eject = installAuthInterceptors(client.instance, {
            isLoggedIn: () => isLoggedIn,
            onUnauthorized,
        });
    });

    afterEach(() => {
        eject();
        queryClient.clear();
    });

    test("passes requests through while logged in", async () => {
        await expect(pollSessionMetadata()).resolves.toEqual({ id: "session-1", updatedAt: "2026-01-01T00:00:00Z" });
        await expect(pollFingerprints()).resolves.toEqual(["fingerprint-1"]);

        expect(backend.requestedPaths).toEqual([SESSION_METADATA_PATH, REFRESH_FINGERPRINTS_PATH]);
        expect(onUnauthorized).not.toHaveBeenCalled();
    });

    test("stops all requests from reaching the backend after the first 401", async () => {
        await pollSessionMetadata();
        backend.expireToken();

        const firstError = await captureError(pollSessionMetadata());
        expect(isAxiosError(firstError) && firstError.response?.status).toBe(401);
        expect(onUnauthorized).toHaveBeenCalledTimes(1);

        for (let i = 0; i < 5; i++) {
            const sessionError = await captureError(pollSessionMetadata());
            const fingerprintsError = await captureError(pollFingerprints());
            expect(isCancel(sessionError)).toBe(true);
            expect(isCancel(fingerprintsError)).toBe(true);
        }

        // One successful poll and the single 401 - nothing after that
        expect(backend.requestedPaths).toEqual([SESSION_METADATA_PATH, SESSION_METADATA_PATH]);
        expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });

    test("does not log out on other error responses", async () => {
        backend.respondWith(500);

        const error = await captureError(pollSessionMetadata());
        expect(isAxiosError(error) && error.response?.status).toBe(500);
        expect(onUnauthorized).not.toHaveBeenCalled();

        backend.respondWith(null);
        await expect(pollSessionMetadata()).resolves.toBeDefined();
        expect(backend.requestedPaths).toEqual([SESSION_METADATA_PATH, SESSION_METADATA_PATH]);
    });

    test("blocks requests until the user is known to be logged in", async () => {
        isLoggedIn = false;

        expect(isCancel(await captureError(pollSessionMetadata()))).toBe(true);
        expect(backend.requestedPaths).toEqual([]);
    });

    test("lets requests marked with SKIP_AUTH_GUARD_META through before login", async () => {
        isLoggedIn = false;

        await expect(
            queryClient.fetchQuery({
                ...getSessionMetadataOptions({
                    client,
                    path: { session_id: "session-1" },
                    meta: SKIP_AUTH_GUARD_META,
                }),
                staleTime: 0,
            }),
        ).resolves.toBeDefined();
        expect(backend.requestedPaths).toEqual([SESSION_METADATA_PATH]);
    });

    test("ejecting the interceptors lets requests through again", async () => {
        isLoggedIn = false;
        expect(isCancel(await captureError(pollSessionMetadata()))).toBe(true);
        expect(backend.requestedPaths).toEqual([]);

        eject();

        await expect(pollSessionMetadata()).resolves.toBeDefined();
        expect(backend.requestedPaths).toEqual([SESSION_METADATA_PATH]);
    });
});
