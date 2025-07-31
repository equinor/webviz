import { KeyKind } from "@framework/DataChannelTypes";
import { SyncSettingKey } from "@framework/SyncSettings";
import type { Template } from "@framework/TemplateRegistry";
import { createTemplateModuleInstance, TemplateRegistry } from "@framework/TemplateRegistry";
import { ChannelIds } from "@modules/SimulationTimeSeries/channelDefs";

const template: Template = {
    name: "Parameter Analysis of Field Oil Production",
    description: "Field oil production correlated against input parameters",
    moduleInstances: [
        createTemplateModuleInstance("SimulationTimeSeries", {
            instanceRef: "MainSimulationTimeSeriesInstance",
            layout: {
                relHeight: 0.5,
                relWidth: 0.5,
                relX: 0,
                relY: 0,
            },

            /*
            initialState: {
                selectedVectorTags: ["FOPT"],
                visualizationMode: VisualizationMode.INDIVIDUAL_REALIZATIONS,
                colorRealizationsByParameter: true,
            },
            */
            syncedSettings: [SyncSettingKey.PARAMETER],
        }),
        createTemplateModuleInstance("ParameterResponseCrossPlot", {
            instanceRef: "MyParameterResponseCrossPlotInstance",
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
            /*
            initialState: {
                crossPlottingType: KeyKind.REALIZATION,
                parameterIdentString: "FWL_CENTRAL~@@~GLOBVAR",
            },
            */
        }),
        createTemplateModuleInstance("ParameterCorrelationPlot", {
            instanceRef: "MyParameterCorrelationPlotInstance",
            layout: {
                relHeight: 0.5,
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
            /*
            initialState: {
                crossPlottingType: KeyKind.REALIZATION,
                showLabels: true,
                numParams: 20,
            },
            */
        }),
        createTemplateModuleInstance("ParameterCorrelationPlot", {
            instanceRef: "MyParameterCorrelationPlotInstance",
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
            /*
            initialState: {
                crossPlottingType: KeyKind.REALIZATION,
                showLabels: true,
                numParams: 20,
            },
            */
        }),
    ],
};

TemplateRegistry.registerTemplate(template);
