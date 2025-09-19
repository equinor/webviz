import { KeyKind } from "@framework/DataChannelTypes";
import { SyncSettingKey } from "@framework/SyncSettings";
import type { Template } from "@framework/TemplateRegistry";
import { TemplateRegistry } from "@framework/TemplateRegistry";
import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { ChannelIds } from "@modules/InplaceVolumesPlot/channelDefs";
import { PlotType as CrossPlotType } from "@modules/ParameterResponseCrossPlot/typesAndEnums";

const template: Template = {
    description: "Inplace volumes overview correlated against input parameters",
    moduleInstances: [
        {
            instanceRef: "MainInplaceVolumesPlotInstance",
            moduleName: "InplaceVolumesPlot",
            layout: {
                relHeight: 0.4,
                relWidth: 0.5,
                relX: 0,
                relY: 0,
            },
            syncedSettings: [SyncSettingKey.INPLACE_VOLUMES_FILTER],
            initialSettings: {
                selectedIndexValueCriteria: IndexValueCriteria.ALLOW_INTERSECTION,
            },
        },
        {
            instanceRef: "MainInplaceVolumesTableInstance2",
            moduleName: "InplaceVolumesTable",
            layout: {
                relHeight: 0.2,
                relWidth: 1,
                relX: 0,
                relY: 0.8,
            },
            syncedSettings: [SyncSettingKey.INPLACE_VOLUMES_FILTER],
            initialSettings: {
                selectedIndexValueCriteria: IndexValueCriteria.ALLOW_INTERSECTION,
            },
        },
        {
            instanceRef: "MyParameterResponseCrossPlotInstance",
            moduleName: "ParameterResponseCrossPlot",
            layout: {
                relHeight: 0.4,
                relWidth: 0.5,
                relX: 0,
                relY: 0.4,
            },

            dataChannelsToInitialSettingsMapping: {
                channelResponse: {
                    listensToInstanceRef: "MainInplaceVolumesPlotInstance",
                    kindOfKey: KeyKind.REALIZATION,
                    channelIdString: ChannelIds.RESPONSE_PER_REAL,
                },
            },
            initialSettings: {
                plotType: CrossPlotType.ParameterResponseCrossPlot,
                crossPlottingType: KeyKind.REALIZATION,
            },
            syncedSettings: [SyncSettingKey.PARAMETER],
        },
        {
            instanceRef: "MyParameterResponseCorrelationBarPlotInstance",
            moduleName: "ParameterResponseCorrelationBarPlot",
            layout: {
                relHeight: 0.8,
                relWidth: 0.5,
                relX: 0.5,
                relY: 0,
            },

            dataChannelsToInitialSettingsMapping: {
                channelResponse: {
                    listensToInstanceRef: "MainInplaceVolumesPlotInstance",
                    kindOfKey: KeyKind.REALIZATION,
                    channelIdString: ChannelIds.RESPONSE_PER_REAL,
                },
            },
            initialSettings: {
                crossPlottingType: KeyKind.REALIZATION,
                showLabels: true,
                numParams: 10,
            },
            syncedSettings: [SyncSettingKey.PARAMETER],
        },
    ],
};

TemplateRegistry.registerTemplate("Correlations between input parameters and inplace volumes", template);
