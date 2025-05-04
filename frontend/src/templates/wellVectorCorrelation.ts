import { InplaceVolumetricsIdentifier_api } from "@api";
import { KeyKind } from "@framework/DataChannelTypes";
import { SyncSettingKey } from "@framework/SyncSettings";
import type { Template } from "@framework/TemplateRegistry";
import { TemplateRegistry } from "@framework/TemplateRegistry";
import { PlotType as CorrPlotType } from "@modules/ParameterCorrelationPlot/typesAndEnums";
import { PlotType as CrossPlotType } from "@modules/ParameterResponseCrossPlot/typesAndEnums";
import { ChannelIds } from "@modules/SimulationTimeSeries/channelDefs";
import { VisualizationMode } from "@modules/SimulationTimeSeries/typesAndEnums";
const template: Template = {
    description:
        "Water cut, gas oil ratio, water bottom hole pressure and oil production rate correlated against input parameters",
    moduleInstances: [
        {
            instanceRef: "MainSimulationTimeSeriesInstance",
            moduleName: "SimulationTimeSeries",
            layout: {
                relHeight: 0.5,
                relWidth: 1,
                relX: 0,
                relY: 0,
            },
            // syncedSettings: [SyncSettingKey.INPLACE_VOLUMETRICS_FILTER, SyncSettingKey.INPLACE_VOLUMETRICS_RESULT_NAME],
            initialSettings: {
                // plotType: PlotType.Histogram,
                selectedVectorTags: ["WWCT:A1", "WGOR:A1", "WBHP:A1", "WOPT:A1"],
                visualizationMode: VisualizationMode.INDIVIDUAL_REALIZATIONS,
            },
        },

        {
            instanceRef: "MyParameterResponseCrossPlotInstance",
            moduleName: "ParameterResponseCrossPlot",
            layout: {
                relHeight: 0.5,
                relWidth: 0.5,
                relX: 0,
                relY: 0.5,
            },

            dataChannelsToInitialSettingsMapping: {
                channelResponse: {
                    listensToInstanceRef: "MainSimulationTimeSeriesInstance",
                    kindOfKey: KeyKind.REALIZATION,
                    channelIdString: ChannelIds.TIME_SERIES,
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
                relHeight: 0.5,
                relWidth: 0.5,
                relX: 0.5,
                relY: 0.5,
            },

            dataChannelsToInitialSettingsMapping: {
                channelResponse: {
                    listensToInstanceRef: "MainSimulationTimeSeriesInstance",
                    kindOfKey: KeyKind.REALIZATION,
                    channelIdString: ChannelIds.TIME_SERIES,
                },
            },
            initialSettings: {
                plotType: CorrPlotType.ParameterCorrelation,
                crossPlottingType: KeyKind.REALIZATION,
                showLabels: true,
                numParams: 50,
            },
        },
    ],
};

TemplateRegistry.registerTemplate("Parameter analysis of well vectors", template);
