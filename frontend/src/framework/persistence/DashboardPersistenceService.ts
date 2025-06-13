import { getDashboardOptions, getDashboardsMetadataOptions } from "@api";
import type { QueryClient } from "@tanstack/query-core";

export class DashboardPersistenceService {
    private _queryClient: QueryClient;

    constructor(queryClient: QueryClient) {
        this._queryClient = queryClient;
    }

    async fetchPrivateDashboard(dashboardId: string) {
        return this._queryClient.fetchQuery({
            ...getDashboardOptions({
                path: {
                    dashboard_id: dashboardId,
                },
            }),
        });
    }

    async fetchPrivateDashboardsMetadata() {
        return this._queryClient.fetchQuery({
            ...getDashboardsMetadataOptions(),
        });
    }
}
