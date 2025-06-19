import { KeyKind } from "@framework/DataChannelTypes";
import { SyncSettingKey } from "@framework/SyncSettings";
import type { Template } from "@framework/TemplateRegistry";
import { TemplateRegistry } from "@framework/TemplateRegistry";
import { IdentifierValueCriteria } from "@modules/_shared/InplaceVolumetrics/TableDefinitionsAccessor";
import { ChannelIds } from "@modules/InplaceVolumetricsPlot/channelDefs";
import { PlotType as CrossPlotType } from "@modules/ParameterResponseCrossPlot/typesAndEnums";

const template: Template = {
    description: "Inplace volumes overview correlated against input parameters",
    moduleInstances: [
        {
            instanceRef: "MainInplaceVolumetricsPlotInstance",
            moduleName: "InplaceVolumetricsPlot",
            layout: {
                relHeight: 0.4,
                relWidth: 0.5,
                relX: 0,
                relY: 0,
            },
            syncedSettings: [SyncSettingKey.INPLACE_VOLUMETRICS_FILTER],
            initialSettings: {
                selectedIdentifierValueCriteria: IdentifierValueCriteria.ALLOW_INTERSECTION,
            },
        },
        {
            instanceRef: "MainInplaceVolumetricsTableInstance2",
            moduleName: "InplaceVolumetricsTable",
            layout: {
                relHeight: 0.2,
                relWidth: 1,
                relX: 0,
                relY: 0.8,
            },
            syncedSettings: [SyncSettingKey.INPLACE_VOLUMETRICS_FILTER],
            initialSettings: {
                selectedIdentifierValueCriteria: IdentifierValueCriteria.ALLOW_INTERSECTION,
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
                    listensToInstanceRef: "MainInplaceVolumetricsPlotInstance",
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
            instanceRef: "MyParameterCorrelationPlotInstance",
            moduleName: "ParameterCorrelationPlot",
            layout: {
                relHeight: 0.8,
                relWidth: 0.5,
                relX: 0.5,
                relY: 0,
            },

            dataChannelsToInitialSettingsMapping: {
                channelResponse: {
                    listensToInstanceRef: "MainInplaceVolumetricsPlotInstance",
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
