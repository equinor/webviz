import { BroadcastChannelKeyCategory } from "@framework/Broadcaster";
import { SyncSettingKey } from "@framework/SyncSettings";
import { Template, TemplateRegistry } from "@framework/TemplateRegistry";
import { PlotType } from "@modules/DistributionPlot/state";
import { BroadcastChannelNames } from "@modules/SimulationTimeSeries/channelDefs";

const template: Template = {
    description: "Combination of simulation time series, sensitivity and distribution plot.",
    layout: [
        {
            templateElementId: "SimulationTimeSeries",
            moduleName: "SimulationTimeSeries",
            relHeight: 0.5,
            relWidth: 0.5,
            relX: 0,
            relY: 0,
            syncedSettings: [SyncSettingKey.ENSEMBLE],
        },
        {
            templateElementId: "Sensitivity",
            moduleName: "Sensitivity",
            relHeight: 0.5,
            relWidth: 0.5,
            relX: 0.5,
            relY: 0,
            syncedSettings: [SyncSettingKey.ENSEMBLE],
            dataChannelToPresetPropsMapping: {
                responseChannelName: {
                    listensToTemplateId: "SimulationTimeSeries",
                    keyCategory: BroadcastChannelKeyCategory.Realization,
                    channelName: BroadcastChannelNames.Realization_Value,
                },
            },
        },
        {
            templateElementId: "DistributionPlot",
            moduleName: "DistributionPlot",
            relHeight: 0.5,
            relWidth: 1,
            relX: 0,
            relY: 0.5,
            syncedSettings: [SyncSettingKey.ENSEMBLE],
            dataChannelToPresetPropsMapping: {
                channelNameX: {
                    listensToTemplateId: "SimulationTimeSeries",
                    keyCategory: BroadcastChannelKeyCategory.Realization,
                    channelName: BroadcastChannelNames.Realization_Value,
                },
            },
            presetProps: {
                plotType: PlotType.Histogram,
                crossPlottingType: BroadcastChannelKeyCategory.Realization,
            },
        },
    ],
};

TemplateRegistry.registerTemplate("Øyvinds Plugin", template);
