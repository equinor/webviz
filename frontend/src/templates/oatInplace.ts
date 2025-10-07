import { KeyKind } from "@framework/DataChannelTypes";
import { SyncSettingKey } from "@framework/SyncSettings";
import type { Template } from "@framework/TemplateRegistry";
import { TemplateRegistry } from "@framework/TemplateRegistry";
import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { ChannelIds } from "@modules/InplaceVolumesPlot/channelDefs";
import { DisplayComponentType } from "@modules/SensitivityPlot/typesAndEnums";

const template: Template = {
    description: "Inplace volumes analysis for design matrix ensembles.",
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
            instanceRef: "SensitivityPlotInstance",
            moduleName: "SensitivityPlot",
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
                displayComponentType: DisplayComponentType.SENSITIVITY_CHART,
            },
        },
        {
            instanceRef: "SensitivityPlotInstance2",
            moduleName: "SensitivityPlot",
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
                displayComponentType: DisplayComponentType.SENSITIVITY_TABLE,
            },
        },
    ],
};

TemplateRegistry.registerTemplate("Sensitivity analysis of inplace volumes", template);
