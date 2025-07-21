import { KeyKind } from "@framework/DataChannelTypes";
import { SyncSettingKey } from "@framework/SyncSettings";
import type { Template } from "@framework/TemplateRegistry";
import { TemplateRegistry } from "@framework/TemplateRegistry";
import { ChannelIds } from "@modules/SimulationTimeSeries/channelDefs";
import { VisualizationMode } from "@modules/SimulationTimeSeries/typesAndEnums";

const template: Template = {
    description: "Correlate one or more simulation vectors (e.g. Field oil production) against input parameters.",
    moduleInstances: [
        {
            instanceRef: "MainSimulationTimeSeriesInstance",
            moduleName: "SimulationTimeSeries",
            layout: {
                relHeight: 0.5,
                relWidth: 0.5,
                relX: 0,
                relY: 0,
            },

            initialSettings: {
                selectedVectorTags: ["FOPT"],
                visualizationMode: VisualizationMode.INDIVIDUAL_REALIZATIONS,
                colorRealizationsByParameter: true,
            },
            syncedSettings: [SyncSettingKey.PARAMETER],
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
            syncedSettings: [SyncSettingKey.PARAMETER],

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
            instanceRef: "MyParameterResponseCorrelationBarPlotInstance",
            moduleName: "ParameterResponseCorrelationBarPlot",
            layout: {
                relHeight: 1,
                relWidth: 0.5,
                relX: 0.5,
                relY: 0,
            },
            syncedSettings: [SyncSettingKey.PARAMETER],

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
                numParams: 20,
            },
        },
    ],
};

TemplateRegistry.registerTemplate("Correlations between input parameters and simulation timeseries", template);
