import { KeyKind } from "@framework/DataChannelTypes";
import { Template, TemplateRegistry } from "@framework/TemplateRegistry";
import { PlotType } from "@modules/DistributionPlot/state";
import { BroadcastChannelNames } from "@modules/SimulationTimeSeriesMatrix/channelDefs";

const template: Template = {
    description: "Debug test",
    moduleInstances: [
        {
            instanceRef: "Sim",
            moduleName: "SimulationTimeSeriesMatrix",
            layout: {
                relHeight: 0.5,
                relWidth: 1.0,
                relX: 0,
                relY: 0,
            },
        },
        {
            instanceRef: "Dist",
            moduleName: "DistributionPlot",
            layout: {
                relHeight: 0.5,
                relWidth: 1.0,
                relX: 0,
                relY: 0.5,
            },
            initialSettings: {
                plotType: PlotType.ScatterWithColorMapping,
            },
            dataChannelsToInitialSettingsMapping: {
                channelX: {
                    listensToInstanceRef: "Sim",
                    kindOfKey: KeyKind.Realization,
                    channelIdString: BroadcastChannelNames.TimeSeries,
                },
                channelY: {
                    listensToInstanceRef: "Sim",
                    kindOfKey: KeyKind.Realization,
                    channelIdString: BroadcastChannelNames.TimeSeries,
                },
                channelColorMapping: {
                    listensToInstanceRef: "Sim",
                    kindOfKey: KeyKind.Realization,
                    channelIdString: BroadcastChannelNames.TimeSeries,
                },
            },
        },
    ],
};

TemplateRegistry.registerTemplate("Debug", template);
