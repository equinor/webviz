import { KeyKind } from "@framework/DataChannelTypes";
import { SyncSettingKey } from "@framework/SyncSettings";
import type { Template } from "@framework/TemplateRegistry";
import { TemplateRegistry } from "@framework/TemplateRegistry";
import { IdentifierValueCriteria } from "@modules/_shared/InplaceVolumetrics/TableDefinitionsAccessor";
import { ChannelIds } from "@modules/InplaceVolumetricsPlot/channelDefs";
import { DisplayComponentType } from "@modules/TornadoChart/typesAndEnums";

const template: Template = {
    description: "Inplace volumes overview for design matrix ensembles.",
    moduleInstances: [
        {
            instanceRef: "MainInplaceVolumetricsPlotInstance",
            moduleName: "InplaceVolumetricsPlot",
            layout: {
                relHeight: 0.5,
                relWidth: 0.5,
                relX: 0,
                relY: 0,
            },
            syncedSettings: [SyncSettingKey.INPLACE_VOLUMETRICS_FILTER, SyncSettingKey.INPLACE_VOLUMETRICS_RESULT_NAME],
            initialSettings: {
                selectedIdentifierValueCriteria: IdentifierValueCriteria.ALLOW_INTERSECTION,
            },
        },
        {
            instanceRef: "MainInplaceVolumetricsTableInstance2",
            moduleName: "InplaceVolumetricsTable",
            layout: {
                relHeight: 0.5,
                relWidth: 0.5,
                relX: 0,
                relY: 0.5,
            },
            syncedSettings: [SyncSettingKey.INPLACE_VOLUMETRICS_FILTER, SyncSettingKey.INPLACE_VOLUMETRICS_RESULT_NAME],
            initialSettings: {
                selectedIdentifierValueCriteria: IdentifierValueCriteria.ALLOW_INTERSECTION,
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
                    listensToInstanceRef: "MainInplaceVolumetricsPlotInstance",
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
                    listensToInstanceRef: "MainInplaceVolumetricsPlotInstance",
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
