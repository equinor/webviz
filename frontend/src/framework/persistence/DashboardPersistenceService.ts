import {
    createDashboard,
    getDashboardOptions,
    getDashboardsMetadataOptions,
    type PrivateDashboardUpdate_api,
} from "@api";
import type { SerializedModuleState } from "@framework/Module";
import type { ModuleInstance } from "@framework/ModuleInstance";
import type { LayoutElement } from "@framework/Workbench";
import type { QueryClient } from "@tanstack/query-core";
import { v4 } from "uuid";

import type { PrivateDashboard } from "./types";

const FLUSH_BUFFER_TIMEOUT_MS = 1000;

export class DashboardPersistenceService {
    private _queryClient: QueryClient;
    private _bufferedModuleInstanceStates: {
        moduleInstanceId: string;
        moduleName: string;
        state: SerializedModuleState<any>;
    }[] = [];
    private _bufferedLayout: LayoutElement[] = [];
    private _lastBufferUpdateMs: number = 0;
    private _bufferedDashboard: PrivateDashboard | null = null;
    private _timeoutId: ReturnType<typeof setTimeout> | null = null;
    private _metadata: {
        title: string;
        description?: string;
    } = {
        title: "",
        description: undefined,
    };
    private _dashboardId: string;

    constructor(queryClient: QueryClient, dashboardId?: string, dashboardName?: string) {
        this._queryClient = queryClient;

        this._dashboardId = dashboardId ?? v4();

        this._metadata.title = dashboardName ?? "New Dashboard";
    }

    registerModuleInstance(moduleInstance: ModuleInstance<any>) {
        this._bufferedModuleInstanceStates.push({
            moduleInstanceId: moduleInstance.getId(),
            moduleName: moduleInstance.getModuleName(),
            state: moduleInstance.getState(),
        });

        this.resetFlushTimeout();
    }

    updateModuleState(moduleInstanceId: string, moduleName: string, moduleState: SerializedModuleState<any>) {
        const module = this._bufferedModuleInstanceStates.find((state) => state.moduleInstanceId === moduleInstanceId);

        if (module) {
            module.state = moduleState;
        } else {
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
        }, FLUSH_BUFFER_TIMEOUT_MS);
    }

    async flushBufferedModuleStates() {
        if (this._bufferedModuleInstanceStates.length === 0) {
            return;
        }

        const dashboard = this.buildDashboard();
        await createDashboard({
            body: dashboard,
        });

        this._bufferedModuleInstanceStates = [];
        this._lastBufferUpdateMs = Date.now();
    }

    private buildDashboard(): PrivateDashboardUpdate_api {
        const dashboard: PrivateDashboardUpdate_api = {
            id: this._dashboardId,
            title: this._metadata.title,
            description: this._metadata.description,
            content: {
                moduleStates: this._bufferedModuleInstanceStates,
                crossModuleState: {
                    dataChannels: {},
                    syncedSettings: {},
                },
                layout: this._bufferedLayout,
            },
        };

        return dashboard;
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
