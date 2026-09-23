import { test as componentTest } from "@playwright/experimental-ct-react";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Component test whose browser context aborts every request that is not for the loopback
 * component-test server. It is installed before the test page is loaded, so the page template's
 * own external stylesheet is blocked too; blocked URLs are exposed for assertions.
 */
export const test = componentTest.extend<{ blockedExternalRequests: string[] }>({
    blockedExternalRequests: [
        async ({ context }, use) => {
            const blockedUrls: string[] = [];
            const isExternal = (url: URL) => !LOOPBACK_HOSTS.has(url.hostname);
            const abort = (route: Parameters<Parameters<typeof context.route>[1]>[0]) => {
                blockedUrls.push(route.request().url());
                return route.abort();
            };
            await context.route(isExternal, abort);
            await use(blockedUrls);
            await context.unroute(isExternal, abort);
        },
        { auto: true },
    ],
});

export { expect } from "@playwright/experimental-ct-react";
