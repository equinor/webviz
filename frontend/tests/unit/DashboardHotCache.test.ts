import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { Dashboard } from "@framework/internal/Dashboard";
import {
    DASHBOARD_HOT_CACHE_MAX_COUNT,
    DASHBOARD_HOT_CACHE_TIMEOUT_MS,
    DashboardHotCache,
    DashboardHotCacheTopic,
} from "@framework/internal/WorkbenchSession/DashboardHotCache";

// The hot cache only ever calls getId() and unload() on a dashboard
function makeDashboardStub(id: string, options?: { failUnload?: boolean }) {
    const unload = vi.fn(() => {
        if (options?.failUnload) {
            throw new Error(`unload of ${id} failed`);
        }
    });
    const dashboard = { getId: () => id, unload } as unknown as Dashboard;
    return { dashboard, unload };
}

function getHotIds(cache: DashboardHotCache): string[] {
    return cache.makeSnapshotGetter(DashboardHotCacheTopic.HOT_DASHBOARD_IDS)();
}

describe("DashboardHotCache", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    test("keeps a deferred dashboard hot until the timeout, then unloads it", () => {
        const cache = new DashboardHotCache();
        const a = makeDashboardStub("a");

        cache.deferEviction(a.dashboard);
        expect(getHotIds(cache)).toEqual(["a"]);

        vi.advanceTimersByTime(DASHBOARD_HOT_CACHE_TIMEOUT_MS - 1);
        expect(a.unload).not.toHaveBeenCalled();
        expect(getHotIds(cache)).toEqual(["a"]);

        vi.advanceTimersByTime(1);
        expect(a.unload).toHaveBeenCalledOnce();
        expect(getHotIds(cache)).toEqual([]);
    });

    test("evicts the oldest dashboard first once the max count is exceeded", () => {
        const cache = new DashboardHotCache();
        const stubs = Array.from({ length: DASHBOARD_HOT_CACHE_MAX_COUNT + 1 }, (_, i) => makeDashboardStub(`d${i}`));

        for (const stub of stubs) {
            cache.deferEviction(stub.dashboard);
        }

        expect(stubs[0].unload).toHaveBeenCalledOnce();
        for (const stub of stubs.slice(1)) {
            expect(stub.unload).not.toHaveBeenCalled();
        }
        expect(getHotIds(cache)).toEqual(stubs.slice(1).map((stub) => stub.dashboard.getId()));
    });

    test("release() stops tracking a dashboard without unloading it", () => {
        const cache = new DashboardHotCache();
        const a = makeDashboardStub("a");

        cache.deferEviction(a.dashboard);
        cache.release("a");
        expect(getHotIds(cache)).toEqual([]);

        vi.advanceTimersByTime(DASHBOARD_HOT_CACHE_TIMEOUT_MS);
        expect(a.unload).not.toHaveBeenCalled();
    });

    test("deferring an already hot dashboard again restarts its timeout", () => {
        const cache = new DashboardHotCache();
        const a = makeDashboardStub("a");

        cache.deferEviction(a.dashboard);
        vi.advanceTimersByTime(DASHBOARD_HOT_CACHE_TIMEOUT_MS - 1);
        cache.deferEviction(a.dashboard);
        expect(getHotIds(cache)).toEqual(["a"]);

        vi.advanceTimersByTime(1);
        expect(a.unload).not.toHaveBeenCalled();

        vi.advanceTimersByTime(DASHBOARD_HOT_CACHE_TIMEOUT_MS);
        expect(a.unload).toHaveBeenCalledOnce();
    });

    test("evictNow() unloads a hot dashboard immediately and ignores others", () => {
        const cache = new DashboardHotCache();
        const a = makeDashboardStub("a");
        const b = makeDashboardStub("b");

        cache.deferEviction(a.dashboard);
        cache.deferEviction(b.dashboard);

        cache.evictNow("a");
        expect(a.unload).toHaveBeenCalledOnce();
        expect(getHotIds(cache)).toEqual(["b"]);

        cache.evictNow("not-hot");
        expect(b.unload).not.toHaveBeenCalled();
        expect(getHotIds(cache)).toEqual(["b"]);

        // The evicted dashboard's timer must be gone too
        vi.advanceTimersByTime(DASHBOARD_HOT_CACHE_TIMEOUT_MS);
        expect(a.unload).toHaveBeenCalledOnce();
    });

    test("clear() cancels every pending eviction without unloading", () => {
        const cache = new DashboardHotCache();
        const a = makeDashboardStub("a");
        const b = makeDashboardStub("b");

        cache.deferEviction(a.dashboard);
        cache.deferEviction(b.dashboard);
        cache.clear();
        expect(getHotIds(cache)).toEqual([]);

        vi.advanceTimersByTime(DASHBOARD_HOT_CACHE_TIMEOUT_MS);
        expect(a.unload).not.toHaveBeenCalled();
        expect(b.unload).not.toHaveBeenCalled();
    });

    test("notifies subscribers whenever the hot ids change", () => {
        const cache = new DashboardHotCache();
        const a = makeDashboardStub("a");
        const onChange = vi.fn();
        cache.getPublishSubscribeDelegate().makeSubscriberFunction(DashboardHotCacheTopic.HOT_DASHBOARD_IDS)(onChange);

        cache.deferEviction(a.dashboard);
        expect(onChange).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(DASHBOARD_HOT_CACHE_TIMEOUT_MS);
        expect(onChange).toHaveBeenCalledTimes(2);
        expect(getHotIds(cache)).toEqual([]);
    });

    describe("when unloading a dashboard fails", () => {
        beforeEach(() => {
            vi.spyOn(console, "error").mockImplementation(() => {});
        });

        test("a timed-out eviction still drops the dashboard and publishes, without throwing", () => {
            const cache = new DashboardHotCache();
            const a = makeDashboardStub("a", { failUnload: true });
            const onChange = vi.fn();
            cache.getPublishSubscribeDelegate().makeSubscriberFunction(DashboardHotCacheTopic.HOT_DASHBOARD_IDS)(
                onChange,
            );

            cache.deferEviction(a.dashboard);
            onChange.mockClear();

            expect(() => vi.advanceTimersByTime(DASHBOARD_HOT_CACHE_TIMEOUT_MS)).not.toThrow();
            expect(a.unload).toHaveBeenCalledOnce();
            expect(getHotIds(cache)).toEqual([]);
            expect(onChange).toHaveBeenCalledOnce();
        });

        test("an over-capacity eviction doesn't make deferEviction() throw", () => {
            const cache = new DashboardHotCache();
            const oldest = makeDashboardStub("oldest", { failUnload: true });
            const others = Array.from({ length: DASHBOARD_HOT_CACHE_MAX_COUNT }, (_, i) => makeDashboardStub(`d${i}`));

            cache.deferEviction(oldest.dashboard);
            for (const stub of others.slice(0, -1)) {
                cache.deferEviction(stub.dashboard);
            }

            // Pushes the cache over capacity, evicting "oldest" - whose unload fails
            expect(() => cache.deferEviction(others[others.length - 1].dashboard)).not.toThrow();
            expect(oldest.unload).toHaveBeenCalledOnce();
            expect(getHotIds(cache)).toEqual(others.map((stub) => stub.dashboard.getId()));
        });

        test("evictNow() still drops the dashboard and publishes", () => {
            const cache = new DashboardHotCache();
            const a = makeDashboardStub("a", { failUnload: true });

            cache.deferEviction(a.dashboard);

            expect(() => cache.evictNow("a")).not.toThrow();
            expect(getHotIds(cache)).toEqual([]);
        });
    });
});
