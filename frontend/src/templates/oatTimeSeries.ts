import { KeyKind } from "@framework/DataChannelTypes";
import { SyncSettingKey } from "@framework/SyncSettings";
import { Template, TemplateRegistry } from "@framework/TemplateRegistry";
import { PlotType } from "@modules/DistributionPlot/typesAndEnums";
import { ChannelIds } from "@modules/SimulationTimeSeriesSensitivity/channelDefs";

const template: Template = {
    description:
        "Dashboard for one-at-a-Time (OAT) sensitivity analysis of time series. Includes a time series chart, a tornado chart for the time series response per sensitivity for a given date, and a distribution chart.",
    moduleInstances: [
        {
            instanceRef: "MainTimeSeriesSensitivityInstance",
            moduleName: "SimulationTimeSeriesSensitivity",
            layout: {
                relHeight: 0.5,
                relWidth: 0.5,
                relX: 0,
                relY: 0,
            },
            syncedSettings: [SyncSettingKey.ENSEMBLE],
        },
        {
            instanceRef: "TornadoChartInstance",
            moduleName: "TornadoChart",
            layout: {
                relHeight: 0.5,
                relWidth: 0.5,
                relX: 0.5,
                relY: 0,
            },
            syncedSettings: [SyncSettingKey.ENSEMBLE],
            dataChannelsToInitialSettingsMapping: {
                response: {
                    listensToInstanceRef: "MainTimeSeriesSensitivityInstance",
                    kindOfKey: KeyKind.REALIZATION,
                    channelIdString: ChannelIds.REALIZATION_VALUE,
                },
            },
        },
        {
            instanceRef: "MyDistributionPlotInstance",
            moduleName: "DistributionPlot",
            layout: {
                relHeight: 0.5,
                relWidth: 1,
                relX: 0,
                relY: 0.5,
            },
            syncedSettings: [SyncSettingKey.ENSEMBLE],
            dataChannelsToInitialSettingsMapping: {
                channelX: {
                    listensToInstanceRef: "MainTimeSeriesSensitivityInstance",
                    kindOfKey: KeyKind.REALIZATION,
                    channelIdString: ChannelIds.REALIZATION_VALUE,
                },
            },
            initialSettings: {
                plotType: PlotType.Histogram,
                crossPlottingType: KeyKind.REALIZATION,
            },
        },
    ],
};

TemplateRegistry.registerTemplate("Sensitivity Analysis of Time Series", template);
