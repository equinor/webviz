import { KeyKind } from "@framework/DataChannelTypes";
import { SyncSettingKey } from "@framework/SyncSettings";
import type { Template } from "@framework/TemplateRegistry";
import { createTemplateModuleInstance, TemplateRegistry } from "@framework/TemplateRegistry";
import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { ChannelIds } from "@modules/InplaceVolumetricsPlot/channelDefs";
import { DisplayComponentType } from "@modules/TornadoChart/typesAndEnums";

const template: Template = {
    name: "Sensitivity Analysis of Inplace volumes",
    description: "Inplace volumes analysis for design matrix ensembles.",
    moduleInstances: [
        createTemplateModuleInstance("InplaceVolumetricsPlot", {
            instanceRef: "MainInplaceVolumetricsPlotInstance",
            layout: {
                relHeight: 0.5,
                relWidth: 0.5,
                relX: 0,
                relY: 0,
            },
            syncedSettings: [SyncSettingKey.INPLACE_VOLUMETRICS_FILTER, SyncSettingKey.INPLACE_VOLUMETRICS_RESULT_NAME],
            /*
            initialState: {
                selectedIdentifierValueCriteria: IdentifierValueCriteria.ALLOW_INTERSECTION,
            },
            */
        }),
        createTemplateModuleInstance("InplaceVolumetricsTable", {
            instanceRef: "MainInplaceVolumetricsTableInstance2",
            layout: {
                relHeight: 0.5,
                relWidth: 0.5,
                relX: 0,
                relY: 0.5,
            },
            syncedSettings: [SyncSettingKey.INPLACE_VOLUMETRICS_FILTER, SyncSettingKey.INPLACE_VOLUMETRICS_RESULT_NAME],
            /*
            initialState: {
                selectedIdentifierValueCriteria: IdentifierValueCriteria.ALLOW_INTERSECTION,
            },
            */
        }),
        createTemplateModuleInstance("TornadoChart", {
            instanceRef: "TornadoChartInstance",
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
            /*
            initialState: {
                displayComponentType: DisplayComponentType.TornadoChart,
            },
            */
        }),
        createTemplateModuleInstance("TornadoChart", {
            instanceRef: "TornadoChartInstance2",
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
            /*
            initialState: {
                displayComponentType: DisplayComponentType.Table,
            },
            */
        }),
    ],
};

TemplateRegistry.registerTemplate(template);
TemplateRegistry.registerTemplate("Sensitivity analysis of inplace volumes", template);
