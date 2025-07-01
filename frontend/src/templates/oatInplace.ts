import { KeyKind } from "@framework/DataChannelTypes";
import { SyncSettingKey } from "@framework/SyncSettings";
import type { Template } from "@framework/TemplateRegistry";
import { TemplateRegistry } from "@framework/TemplateRegistry";
import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { ChannelIds } from "@modules/InplaceVolumesPlot/channelDefs";
import { DisplayComponentType } from "@modules/TornadoChart/typesAndEnums";

const template: Template = {
    description: "Inplace volumes overview for design matrix ensembles.",
    moduleInstances: [
        {
            instanceRef: "MainInplaceVolumesPlotInstance",
            moduleName: "InplaceVolumesPlot",
            layout: {
                relHeight: 0.5,
                relWidth: 0.5,
                relX: 0,
                relY: 0,
            },
            syncedSettings: [SyncSettingKey.INPLACE_VOLUMES_FILTER, SyncSettingKey.INPLACE_VOLUMES_RESULT_NAME],
            initialSettings: {
                selectedIndexValueCriteria: IndexValueCriteria.ALLOW_INTERSECTION,
            },
        },
        {
            instanceRef: "MainInplaceVolumesTableInstance2",
            moduleName: "InplaceVolumesTable",
            layout: {
                relHeight: 0.5,
                relWidth: 0.5,
                relX: 0,
                relY: 0.5,
            },
            syncedSettings: [SyncSettingKey.INPLACE_VOLUMES_FILTER, SyncSettingKey.INPLACE_VOLUMES_RESULT_NAME],
            initialSettings: {
                selectedIndexValueCriteria: IndexValueCriteria.ALLOW_INTERSECTION,
            },
        },
        {
            instanceRef: "TornadoChartInstance",
            moduleName: "TornadoChart",
            layout: {
                relHeight: 0.5,
                relWidth: 0.5,
                relX: 0.5,
                relY: 0,
            },
            syncedSettings: [SyncSettingKey.ENSEMBLE],
            dataChannelsToInitialSettingsMapping: {
                response: {
                    listensToInstanceRef: "MainInplaceVolumesPlotInstance",
                    kindOfKey: KeyKind.REALIZATION,
                    channelIdString: ChannelIds.RESPONSE_PER_REAL,
                },
            },
            initialSettings: {
                displayComponentType: DisplayComponentType.TornadoChart,
            },
        },
        {
            instanceRef: "TornadoChartInstance2",
            moduleName: "TornadoChart",
            layout: {
                relHeight: 0.5,
                relWidth: 0.5,
                relX: 0.5,
                relY: 0.5,
            },
            syncedSettings: [SyncSettingKey.ENSEMBLE],
            dataChannelsToInitialSettingsMapping: {
                response: {
                    listensToInstanceRef: "MainInplaceVolumesPlotInstance",
                    kindOfKey: KeyKind.REALIZATION,
                    channelIdString: ChannelIds.RESPONSE_PER_REAL,
                },
            },
            initialSettings: {
                displayComponentType: DisplayComponentType.Table,
            },
        },
    ],
};

TemplateRegistry.registerTemplate("Sensitivity Analysis of Inplace volumes", template);
