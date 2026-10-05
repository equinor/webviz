import { afterEach, describe, expect, test, vi } from "vitest";

import { NavigationManager } from "@framework/internal/NavigationManager";

type HistoryEntry = { url: string; state: unknown };
type PopStateListener = (event: { state: unknown }) => void;

// Just enough of window.location/history for NavigationManager. Like in a browser, traversals are
// asynchronous, popstate carries the landed entry's state, and entry states survive a reload.
class FakeBrowser {
    private _entries: HistoryEntry[];
    private _index: number;
    private _popStateListeners = new Set<PopStateListener>();

    constructor(urls: string[]) {
        this._entries = urls.map((url) => ({ url, state: null }));
        this._index = this._entries.length - 1;
    }

    get currentUrl(): string {
        return this._entries[this._index].url;
    }

    get currentState(): unknown {
        return this._entries[this._index].state;
    }

    get length(): number {
        return this._entries.length;
    }

    back(): void {
        this.go(-1);
    }

    forward(): void {
        this.go(1);
    }

    go(delta: number): void {
        const target = this._index + delta;
        if (delta === 0 || target < 0 || target >= this._entries.length) {
            return;
        }
        setTimeout(() => {
            this._index = target;
            for (const listener of this._popStateListeners) {
                listener({ state: this.currentState });
            }
        }, 0);
    }

    /** A new page instance on the same history - the old page's listeners are gone. */
    reload(): void {
        this._popStateListeners.clear();
    }

    install(): void {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const browser = this;
        vi.stubGlobal("window", {
            location: {
                get href() {
                    return browser.currentUrl;
                },
            },
            history: {
                get state() {
                    return browser.currentState;
                },
                pushState(state: unknown, _unused: string, url: string) {
                    browser._entries.splice(browser._index + 1);
                    browser._entries.push({ url: browser.resolve(url), state: structuredClone(state) });
                    browser._index++;
                },
                replaceState(state: unknown, _unused: string, url: string) {
                    browser._entries[browser._index] = { url: browser.resolve(url), state: structuredClone(state) };
                },
                go: (delta: number) => browser.go(delta),
            },
            addEventListener(type: string, listener: PopStateListener) {
                if (type === "popstate") {
                    browser._popStateListeners.add(listener);
                }
            },
            removeEventListener(type: string, listener: PopStateListener) {
                if (type === "popstate") {
                    browser._popStateListeners.delete(listener);
                }
            },
        });
    }

    private resolve(url: string): string {
        return new URL(url, this.currentUrl).href;
    }
}

function dashboardUrl(dashboardId: string): string {
    return `https://webviz.test/session/s1/dashboard/${dashboardId}`;
}

function startManager(browser: FakeBrowser): NavigationManager {
    browser.install();
    const navigationManager = new NavigationManager();
    navigationManager.start();
    return navigationManager;
}

// Mimics the session manager: entries of deleted dashboards are skipped
function handleNavigationSkipping(
    navigationManager: NavigationManager,
    browser: FakeBrowser,
    deletedUrls: Set<string>,
): { skipResults: boolean[] } {
    const skipResults: boolean[] = [];
    navigationManager.setOnNavigate(async () => {
        if (deletedUrls.has(browser.currentUrl)) {
            skipResults.push(navigationManager.skipEntry());
        }
        return true;
    });
    return { skipResults };
}

// Lets pending traversals, popstate handlers and the skips they trigger run
async function settle(): Promise<void> {
    for (let i = 0; i < 20; i++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
}

describe("NavigationManager", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test("numbers the entries of a fresh visit from 0", () => {
        const browser = new FakeBrowser([dashboardUrl("A")]);
        const navigationManager = startManager(browser);
        expect(browser.currentState).toEqual({ entryIndex: 0 });

        navigationManager.pushState(dashboardUrl("B"));
        expect(browser.currentState).toEqual({ entryIndex: 1 });

        navigationManager.replaceState(dashboardUrl("C"));
        expect(browser.currentState).toEqual({ entryIndex: 1 });
    });

    test("doesn't add an entry for the URL already shown", () => {
        const browser = new FakeBrowser([dashboardUrl("A")]);
        const navigationManager = startManager(browser);

        navigationManager.pushState(dashboardUrl("A"));

        expect(browser.length).toBe(1);
        expect(browser.currentState).toEqual({ entryIndex: 0 });
    });

    test("skips a deleted dashboard's entry when going back", async () => {
        const browser = new FakeBrowser([dashboardUrl("A")]);
        const navigationManager = startManager(browser);
        navigationManager.pushState(dashboardUrl("B"));
        navigationManager.pushState(dashboardUrl("C"));
        handleNavigationSkipping(navigationManager, browser, new Set([dashboardUrl("B")]));

        browser.back();
        await settle();

        expect(browser.currentUrl).toBe(dashboardUrl("A"));
        expect(navigationManager.getCurrentUrl()).toBe(dashboardUrl("A"));
    });

    test("skips a deleted dashboard's entry when going forward", async () => {
        const browser = new FakeBrowser([dashboardUrl("A")]);
        const navigationManager = startManager(browser);
        navigationManager.pushState(dashboardUrl("B"));
        navigationManager.pushState(dashboardUrl("C"));
        const deletedUrls = new Set<string>();
        handleNavigationSkipping(navigationManager, browser, deletedUrls);

        browser.go(-2);
        await settle();
        deletedUrls.add(dashboardUrl("B"));
        browser.forward();
        await settle();

        expect(browser.currentUrl).toBe(dashboardUrl("C"));
    });

    test("doesn't skip an entry picked further away than one step", async () => {
        const browser = new FakeBrowser([dashboardUrl("A")]);
        const navigationManager = startManager(browser);
        navigationManager.pushState(dashboardUrl("B"));
        navigationManager.pushState(dashboardUrl("C"));
        navigationManager.pushState(dashboardUrl("D"));
        const { skipResults } = handleNavigationSkipping(navigationManager, browser, new Set([dashboardUrl("B")]));

        browser.go(-2);
        await settle();

        expect(skipResults).toEqual([false]);
        expect(browser.currentUrl).toBe(dashboardUrl("B"));
    });

    test("never skips past the first entry of the visit", async () => {
        const browser = new FakeBrowser(["https://elsewhere.test/", dashboardUrl("A")]);
        const navigationManager = startManager(browser);
        navigationManager.pushState(dashboardUrl("B"));
        const { skipResults } = handleNavigationSkipping(navigationManager, browser, new Set([dashboardUrl("A")]));

        browser.back();
        await settle();

        expect(skipResults).toEqual([false]);
        expect(browser.currentUrl).toBe(dashboardUrl("A"));
    });

    test("keeps numbering across a reload, so entries from before it are still skipped correctly", async () => {
        const browser = new FakeBrowser([dashboardUrl("A")]);
        let navigationManager = startManager(browser);
        navigationManager.pushState(dashboardUrl("B"));
        navigationManager.pushState(dashboardUrl("C"));

        browser.reload();
        navigationManager = startManager(browser);
        expect(browser.currentState).toEqual({ entryIndex: 2 });

        navigationManager.pushState(dashboardUrl("A"));
        navigationManager.pushState(dashboardUrl("C"));
        handleNavigationSkipping(navigationManager, browser, new Set([dashboardUrl("B")]));

        // C -> A -> C (reloaded) -> B (deleted, skipped) -> A
        for (let i = 0; i < 3; i++) {
            browser.back();
            await settle();
        }

        expect(browser.currentUrl).toBe(dashboardUrl("A"));
        expect(browser.currentState).toEqual({ entryIndex: 0 });
    });

    test("restores the previous URL when a navigation is cancelled", async () => {
        const browser = new FakeBrowser([dashboardUrl("A")]);
        const navigationManager = startManager(browser);
        navigationManager.pushState(dashboardUrl("B"));
        navigationManager.setOnNavigate(async () => false);

        browser.back();
        await settle();

        expect(browser.currentUrl).toBe(dashboardUrl("B"));
        expect(browser.currentState).toEqual({ entryIndex: 1 });
        expect(navigationManager.getCurrentUrl()).toBe(dashboardUrl("B"));
    });
});
