import type { Dashboard } from "@framework/internal/Dashboard";
import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";

// How long a dashboard stays fully mounted (module instances + atom stores intact) after being
// switched away from, before it's actually torn down.
export const DASHBOARD_HOT_CACHE_TIMEOUT_MS = 5 * 60 * 1000;

// Max number of hot dashboards at once, regardless of the timeout - bounds memory and, above all, the
// number of WebGL contexts. The oldest is evicted first.
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
 * Keeps dashboards that were switched away from mounted for a while, so switching back is instant.
 * Publishes the ids of these "hot" dashboards, e.g. for rendering them.
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
     * Cancels a dashboard's pending eviction, if any, without unloading it - when switching back to it,
     * or when it's being destroyed another way (so a stale timer doesn't act on it later).
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
            // Dropped regardless, keeping the published ids in sync - rethrowing would abort a switch halfway
            // or escape the timer. unload() throws before any teardown, so the dashboard stays usable.
            console.error(`Failed to evict dashboard "${dashboardId}":`, error);
        }
    }

    private notify(): void {
        this._hotDashboardIdsSnapshot = this._pendingEvictions.map((entry) => entry.dashboard.getId());
        this._publishSubscribeDelegate.notifySubscribers(DashboardHotCacheTopic.HOT_DASHBOARD_IDS);
    }
}
