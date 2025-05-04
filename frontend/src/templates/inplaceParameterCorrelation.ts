import { InplaceVolumetricsIdentifier_api } from "@api";
import { KeyKind } from "@framework/DataChannelTypes";
import { SyncSettingKey } from "@framework/SyncSettings";
import type { Template } from "@framework/TemplateRegistry";
import { TemplateRegistry } from "@framework/TemplateRegistry";
import { PlotType as CorrPlotType } from "@modules/ParameterCorrelationPlot/typesAndEnums";
import { PlotType as CrossPlotType } from "@modules/ParameterResponseCrossPlot/typesAndEnums";
import { ChannelIds } from "@modules/InplaceVolumetricsPlot/channelDefs";
import { IdentifierValueCriteria } from "@modules/_shared/InplaceVolumetrics/TableDefinitionsAccessor";

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
            syncedSettings: [SyncSettingKey.INPLACE_VOLUMETRICS_FILTER, SyncSettingKey.INPLACE_VOLUMETRICS_RESULT_NAME],
            initialSettings: {
                selectedIdentifierValueCriteria: IdentifierValueCriteria.ALLOW_INTERSECTION,
            },
        },
        {
            instanceRef: "MainInplaceVolumetricsTableInstance",
            moduleName: "InplaceVolumetricsTable",
            layout: {
                relHeight: 0.2,
                relWidth: 1,
                relX: 0,
                relY: 0.8,
            },
            syncedSettings: [SyncSettingKey.INPLACE_VOLUMETRICS_FILTER, SyncSettingKey.INPLACE_VOLUMETRICS_RESULT_NAME],
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
                parameterIdentString: "FWL_CENTRAL~@@~GLOBVAR",
            },
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
                plotType: CorrPlotType.ParameterCorrelation,
                crossPlottingType: KeyKind.REALIZATION,
                showLabels: true,
            },
        },
    ],
};

TemplateRegistry.registerTemplate("Parameter analysis of inplace volumes", template);
