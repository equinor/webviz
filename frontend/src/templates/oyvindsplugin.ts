import { BroadcastChannelKeyCategory } from "@framework/Broadcaster";
import { SyncSettingKey } from "@framework/SyncSettings";
import { Template, TemplateRegistry } from "@framework/TemplateRegistry";
import { PlotType } from "@modules/DistributionPlot/state";
import { BroadcastChannelNames } from "@modules/SimulationTimeSeries/channelDefs";

const template: Template = {
    description:
        "Combination of simulation time series, sensitivity and distribution plot. All are synced to the same ensemble. Data is shared for realizations.",
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
            instanceRef: "MySensitivityInstance",
            moduleName: "Sensitivity",
            layout: {
                relHeight: 0.5,
                relWidth: 0.5,
                relX: 0.5,
                relY: 0,
            },
            syncedSettings: [SyncSettingKey.ENSEMBLE],
            dataChannelsToInitialSettingsMapping: {
                responseChannelName: {
                    listensToInstanceRef: "MainTimeSeriesSensitivityInstance",
                    keyCategory: BroadcastChannelKeyCategory.Realization,
                    channelName: BroadcastChannelNames.Realization_Value,
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
                channelNameX: {
                    listensToInstanceRef: "MainTimeSeriesSensitivityInstance",
                    keyCategory: BroadcastChannelKeyCategory.Realization,
                    channelName: BroadcastChannelNames.Realization_Value,
                },
            },
            initialSettings: {
                plotType: PlotType.Histogram,
                crossPlottingType: BroadcastChannelKeyCategory.Realization,
            },
        },
    ],
};

TemplateRegistry.registerTemplate("Øyvind's plugin", template);
