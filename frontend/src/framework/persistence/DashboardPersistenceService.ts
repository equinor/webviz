import { getDashboardOptions, getDashboardsMetadataOptions, type ModuleState_api } from "@api";
import type { QueryClient } from "@tanstack/query-core";
import type { PrivateDashboard } from "./types";
import type { ModuleState } from "@framework/Module";
import { v4 } from "uuid";
import type { LayoutElement } from "@framework/Workbench";

const FLUSH_BUFFER_TIMEOUT_MS = 1000;

export class DashboardPersistenceService {
    private _queryClient: QueryClient;
    private _bufferedModuleInstanceStates: {
        moduleInstanceId: string;
        moduleName: string;
        state: ModuleState<any>;
    }[] = [];
    private _bufferedLayout: LayoutElement[] = [];
    private _lastBufferUpdateMs: number = 0;
    private _bufferedDashboard: PrivateDashboard | null = null;
    private _timeoutId: ReturnType<typeof setTimeout> | null = null;
    private _dashboardName: string;
    private _dashboardId: string;

    constructor(queryClient: QueryClient, dashboardId?: string, dashboardName: string) {
        this._queryClient = queryClient;

        this._dashboardId = dashboardId ?? v4();
        this._dashboardName = dashboardName;
    }

    updateModuleState(moduleInstanceId: string, moduleName: string, moduleState: ModuleState<any>) {
        const module = this._bufferedModuleInstanceStates.find(
            (state) => state.moduleInstanceId === moduleInstanceId
        );

        if (module) {
            module.state = moduleState;
        }
        else {
            this._bufferedModuleInstanceStates.push({
                moduleInstanceId,
                moduleName: moduleName,
                state: moduleState,
            });
        }

            this.resetFlushTimeout();
    }

    resetFlushTimeout() {
        this._lastBufferUpdateMs = Date.now();

        if (this._timeoutId) {
            clearTimeout(this._timeoutId);
        }

        this._timeoutId = setTimeout(() => {
            this.flushBufferedModuleStates();
        },  FLUSH_BUFFER_TIMEOUT_MS);
    }

    flushBufferedModuleStates() {
        if (this._bufferedModuleInstanceStates.length === 0) {
            return;
        }

        const moduleStates: ModuleState<any>[] = Array.from(this._bufferedModuleInstanceStates.values());
        this._bufferedModuleInstanceStates.clear();
        this._lastBufferUpdateMs = Date.now();

        this._queryClient.setQueryData({
            queryKey: ["moduleStates"],
            queryFn: () => moduleStates,
        });
    }

    private buildDashboard(): PrivateDashboard {
        const moduleStates: ModuleState_api[] = [];

        const dashboard: PrivateDashboard = {
            id: this._dashboardId,
            metadata: {
                title
            }
            content: {
                moduleStates: this._bufferedModuleInstanceStates,
                crossModuleState: {
                    dataChannels: {},
                    syncedSettings: {},
                },
                layout: this._bufferedLayout
            }
        };
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
