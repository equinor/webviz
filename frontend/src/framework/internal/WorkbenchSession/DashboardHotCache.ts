import type { Dashboard } from "@framework/internal/Dashboard";
import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";

// How long a dashboard stays fully mounted (module instances + atom stores intact) after being
// switched away from, before it's actually torn down.
export const DASHBOARD_HOT_CACHE_TIMEOUT_MS = 5 * 60 * 1000;

// Upper bound on how many dashboards can be hot (pending eviction) at once, independent of the
// timeout above - keeps memory and, more importantly, simultaneous WebGL contexts bounded even if
// the user cycles through many dashboards within the timeout window. Oldest hot dashboard is
// evicted first once this is exceeded.
export const DASHBOARD_HOT_CACHE_MAX_COUNT = 4;

export enum DashboardHotCacheTopic {
    HOT_DASHBOARD_IDS = "HotDashboardIds",
}

export type DashboardHotCacheTopicPayloads = {
    [DashboardHotCacheTopic.HOT_DASHBOARD_IDS]: string[];
};

type PendingEviction = {
    dashboard: Dashboard;
    timer: ReturnType<typeof setTimeout>;
};

/**
 * Tracks dashboards that have been switched away from but are kept fully mounted for a while, so
 * switching back to one is instant instead of paying the full teardown/recreate cost again.
 * Publishes its current hot-dashboard-id list so React components (e.g. a view-keep-alive renderer)
 * can subscribe and stay in sync.
 */
export class DashboardHotCache implements PublishSubscribe<DashboardHotCacheTopicPayloads> {
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<DashboardHotCacheTopicPayloads>();
    private _pendingEvictions: PendingEviction[] = [];
    private _hotDashboardIdsSnapshot: string[] = [];

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<DashboardHotCacheTopicPayloads> {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends DashboardHotCacheTopic>(topic: T): () => DashboardHotCacheTopicPayloads[T] {
        const snapshotGetter = (): any => {
            if (topic === DashboardHotCacheTopic.HOT_DASHBOARD_IDS) {
                return this._hotDashboardIdsSnapshot;
            }
            throw new Error(`No snapshot getter for topic ${topic}`);
        };
        return snapshotGetter;
    }

    /**
     * Call instead of `dashboard.unload()` when switching away from it. The dashboard stays fully
     * mounted until the timeout elapses or it's evicted early to stay within the max hot count,
     * whichever comes first.
     */
    deferEviction(dashboard: Dashboard): void {
        // A dashboard should never already have a pending eviction when this is called (it would
        // have to be the active dashboard to be switched away from), but guard against a duplicate
        // timer regardless.
        this.releaseInternal(dashboard.getId());

        const timer = setTimeout(() => {
            this.evictInternal(dashboard.getId());
            this.notify();
        }, DASHBOARD_HOT_CACHE_TIMEOUT_MS);
        this._pendingEvictions.push({ dashboard, timer });

        while (this._pendingEvictions.length > DASHBOARD_HOT_CACHE_MAX_COUNT) {
            this.evictInternal(this._pendingEvictions[0].dashboard.getId());
        }
        this.notify();
    }

    /**
     * Stops tracking a dashboard's pending eviction, if it has one, without unloading it. Covers two
     * cases: switching back to a still-hot dashboard (its module instances are untouched either way -
     * Dashboard.load()'s own "nothing cached" early-return already makes reactivating a still-hot
     * dashboard a no-op) and a dashboard being removed from the session or the session itself being
     * torn down (it's being destroyed through a different path already, so this just avoids a stale
     * timer later acting on an already-removed dashboard).
     */
    release(dashboardId: string): void {
        this.releaseInternal(dashboardId);
        this.notify();
    }

    /**
     * Dev-mode helper: evict a hot dashboard right now instead of waiting for its timer (or the max
     * count) to expire, so the teardown/recreate path can be exercised on demand. No-op if the
     * dashboard isn't currently hot.
     */
    evictNow(dashboardId: string): void {
        const isHot = this._pendingEvictions.some((entry) => entry.dashboard.getId() === dashboardId);
        if (!isHot) {
            return;
        }
        this.evictInternal(dashboardId);
        this.notify();
    }

    /** Cancels every pending eviction. Call on session teardown. */
    clear(): void {
        for (const entry of this._pendingEvictions) {
            clearTimeout(entry.timer);
        }
        this._pendingEvictions = [];
        this.notify();
    }

    private releaseInternal(dashboardId: string): void {
        const index = this._pendingEvictions.findIndex((entry) => entry.dashboard.getId() === dashboardId);
        if (index === -1) {
            return;
        }
        clearTimeout(this._pendingEvictions[index].timer);
        this._pendingEvictions.splice(index, 1);
    }

    private evictInternal(dashboardId: string): void {
        const index = this._pendingEvictions.findIndex((entry) => entry.dashboard.getId() === dashboardId);
        if (index === -1) {
            return;
        }
        const [{ dashboard, timer }] = this._pendingEvictions.splice(index, 1);
        clearTimeout(timer);
        try {
            dashboard.unload();
        } catch (error) {
            // Dropped regardless, so the published hot ids keep matching what's tracked here - and
            // throwing would abort a dashboard switch halfway (see deferEviction()) or escape the timer.
            // Dashboard.unload() only throws before tearing anything down, so the dashboard stays
            // loaded and can still be activated again.
            console.error(`Failed to evict dashboard "${dashboardId}":`, error);
        }
    }

    private notify(): void {
        this._hotDashboardIdsSnapshot = this._pendingEvictions.map((entry) => entry.dashboard.getId());
        this._publishSubscribeDelegate.notifySubscribers(DashboardHotCacheTopic.HOT_DASHBOARD_IDS);
    }
}
