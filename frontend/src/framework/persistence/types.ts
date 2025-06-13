import type { ModuleState_api, PrivateDashboardOutput_api } from "@api";
import type { LayoutElement } from "@framework/Workbench";

export type PrivateDashboard = PrivateDashboardOutput_api & {
    content: {
        layout: LayoutElement[];
        moduleStates: ModuleState_api[];
        crossModuleState: {
            dataChannels: Record<string, any>;
            syncedSettings: Record<string, any>;
        };
    };
};
