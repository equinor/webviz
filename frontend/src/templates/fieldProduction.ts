import { KeyKind } from "@framework/DataChannelTypes";
import type { Template } from "@framework/TemplateRegistry";
import { TemplateRegistry } from "@framework/TemplateRegistry";
import { ChannelIds } from "@modules/SimulationTimeSeries/channelDefs";
import { VisualizationMode } from "@modules/SimulationTimeSeries/typesAndEnums";

const template: Template = {
    description: "Field production correlated against input parameters",
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

            initialSettings: {
                selectedVectorTags: ["FOPT"],
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
                crossPlottingType: KeyKind.REALIZATION,
                showLabels: true,
                numParams: 50,
            },
        },
    ],
};

TemplateRegistry.registerTemplate("Parameter analysis of field production", template);
