import { SyncSettingKey } from "@framework/SyncSettings";
import type { Template } from "@framework/TemplateRegistry";
import { createTemplateModuleInstance, TemplateRegistry } from "@framework/TemplateRegistry";
import { KeyKind } from "@framework/types/dataChannnel";
import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { ChannelIds } from "@modules/InplaceVolumesNew/channelDefs";
import { DisplayComponentType } from "@modules/SensitivityPlot/typesAndEnums";

const template: Template = {
    name: "Sensitivity analysis of inplace volumes",
    description: "Inplace volumes analysis for design matrix ensembles.",
    moduleInstances: [
        createTemplateModuleInstance("InplaceVolumesPlot", {
            instanceRef: "MainInplaceVolumesPlotInstance",
            layout: {
                relHeight: 0.5,
                relWidth: 0.5,
                relX: 0,
                relY: 0,
            },
            syncedSettings: [SyncSettingKey.INPLACE_VOLUMES_FILTER, SyncSettingKey.INPLACE_VOLUMES_RESULT_NAME],
            initialState: {
                settings: {
                    indexValueCriteria: IndexValueCriteria.ALLOW_INTERSECTION,
                },
            },
        }),
        createTemplateModuleInstance("InplaceVolumesTable", {
            instanceRef: "MainInplaceVolumesTableInstance2",
            layout: {
                relHeight: 0.5,
                relWidth: 0.5,
                relX: 0,
                relY: 0.5,
            },
            syncedSettings: [SyncSettingKey.INPLACE_VOLUMES_FILTER, SyncSettingKey.INPLACE_VOLUMES_RESULT_NAME],
            initialState: {
                settings: {
                    selectedIndexValueCriteria: IndexValueCriteria.ALLOW_INTERSECTION,
                },
            },
        }),
        createTemplateModuleInstance("SensitivityPlot", {
            instanceRef: "SensitivityPlotInstance",
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
            initialState: {
                settings: {
                    displayComponentType: DisplayComponentType.SENSITIVITY_CHART,
                },
            },
        }),
        createTemplateModuleInstance("SensitivityPlot", {
            instanceRef: "SensitivityPlotInstance2",
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
            initialState: {
                settings: {
                    displayComponentType: DisplayComponentType.SENSITIVITY_TABLE,
                },
            },
        }),
    ],
};

TemplateRegistry.registerTemplate(template);
