import { KeyKind } from "@framework/DataChannelTypes";
import { SyncSettingKey } from "@framework/SyncSettings";
import type { Template } from "@framework/TemplateRegistry";
import { createTemplateModuleInstance, TemplateRegistry } from "@framework/TemplateRegistry";
import { ChannelIds } from "@modules/SimulationTimeSeriesSensitivity/channelDefs";

const template: Template = {
    name: "Sensitivity analysis of timeseries",
    description: "Simulation timeseries analysis for design matrix ensembles.",
    moduleInstances: [
        createTemplateModuleInstance("SimulationTimeSeriesSensitivity", {
            instanceRef: "MainTimeSeriesSensitivityInstance",
            layout: {
                relHeight: 0.5,
                relWidth: 0.5,
                relX: 0,
                relY: 0,
            },
            syncedSettings: [SyncSettingKey.ENSEMBLE],
        }),
        createTemplateModuleInstance("TornadoChart", {
            instanceRef: "TornadoChartInstance",
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
        }),
        createTemplateModuleInstance("DistributionPlot", {
            instanceRef: "MyDistributionPlotInstance",
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
            /*
            initialState: {
                settings: {
                    plotType: PlotType.Histogram,
                    crossPlottingType: KeyKind.REALIZATION,
                }
            },
            */
        }),
    ],
};

TemplateRegistry.registerTemplate(template);
