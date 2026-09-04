import type { Dashboard } from "@framework/internal/Dashboard";
import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";

// How long a dashboard stays fully mounted (module instances + atom stores intact) after being
// switched away from, before it's actually torn down.
const DASHBOARD_HOT_CACHE_TIMEOUT_MS = 5 * 60 * 1000;

// Upper bound on how many dashboards can be hot (pending eviction) at once, independent of the
// timeout above - keeps memory and, more importantly, simultaneous WebGL contexts bounded even if
// the user cycles through many dashboards within the timeout window. Oldest hot dashboard is
// evicted first once this is exceeded.
const DASHBOARD_HOT_CACHE_MAX_COUNT = 4;

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
    private _pending: PendingEviction[] = [];
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
        this.forgetInternal(dashboard.getId());

        const timer = setTimeout(() => {
            this.evictInternal(dashboard.getId());
            this.notify();
        }, DASHBOARD_HOT_CACHE_TIMEOUT_MS);
        this._pending.push({ dashboard, timer });

        while (this._pending.length > DASHBOARD_HOT_CACHE_MAX_COUNT) {
            this.evictInternal(this._pending[0].dashboard.getId());
        }
        this.notify();
    }

    /**
     * Call when switching to a dashboard, to cancel its pending eviction if it has one. Its module
     * instances are untouched either way - Dashboard.load()'s own "nothing cached" early-return
     * already makes reactivating a still-hot dashboard a no-op - so there's nothing else to do here.
     */
    cancelEviction(dashboardId: string): void {
        this.forget(dashboardId);
    }

    /**
     * Call when a dashboard is removed from the session, or the session itself is torn down - the
     * dashboard is being destroyed through a different path already, so this only stops tracking
     * it (no `unload()` call), avoiding a stale timer later acting on an already-removed dashboard.
     */
    forget(dashboardId: string): void {
        this.forgetInternal(dashboardId);
        this.notify();
    }

    /**
     * Dev-mode helper: evict a hot dashboard right now instead of waiting for its timer (or the max
     * count) to expire, so the teardown/recreate path can be exercised on demand. No-op if the
     * dashboard isn't currently hot.
     */
    evictNow(dashboardId: string): void {
        const isHot = this._pending.some((entry) => entry.dashboard.getId() === dashboardId);
        if (!isHot) {
            return;
        }
        this.evictInternal(dashboardId);
        this.notify();
    }

    /** Cancels every pending eviction. Call on session teardown. */
    clear(): void {
        for (const entry of this._pending) {
            clearTimeout(entry.timer);
        }
        this._pending = [];
        this.notify();
    }

    private forgetInternal(dashboardId: string): void {
        const index = this._pending.findIndex((entry) => entry.dashboard.getId() === dashboardId);
        if (index === -1) {
            return;
        }
        clearTimeout(this._pending[index].timer);
        this._pending.splice(index, 1);
    }

    private evictInternal(dashboardId: string): void {
        const index = this._pending.findIndex((entry) => entry.dashboard.getId() === dashboardId);
        if (index === -1) {
            return;
        }
        const [{ dashboard, timer }] = this._pending.splice(index, 1);
        clearTimeout(timer);
        dashboard.unload();
    }

    private notify(): void {
        this._hotDashboardIdsSnapshot = this._pending.map((entry) => entry.dashboard.getId());
        this._publishSubscribeDelegate.notifySubscribers(DashboardHotCacheTopic.HOT_DASHBOARD_IDS);
    }
}
