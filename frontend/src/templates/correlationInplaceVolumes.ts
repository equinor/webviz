import { SyncSettingKey } from "@framework/SyncSettings";
import type { Template } from "@framework/TemplateRegistry";
import { createTemplateModuleInstance, TemplateRegistry } from "@framework/TemplateRegistry";
import { KeyKind } from "@framework/types/dataChannnel";
import { ChannelIds } from "@modules/InplaceVolumesPlot/channelDefs";

const template: Template = {
    name: "Parameter Analysis of Inplace Volumes",
    description: "Inplace volumes overview correlated against input parameters",
    moduleInstances: [
        createTemplateModuleInstance("InplaceVolumesPlot", {
            instanceRef: "MainInplaceVolumetricsPlotInstance",
            layout: {
                relHeight: 0.4,
                relWidth: 0.5,
                relX: 0,
                relY: 0,
            },
            syncedSettings: [SyncSettingKey.INPLACE_VOLUMES_FILTER],
            /*
            initialState: {
                selectedIdentifierValueCriteria: IdentifierValueCriteria.ALLOW_INTERSECTION,
            },
            */
        }),
        createTemplateModuleInstance("InplaceVolumesTable", {
            instanceRef: "MainInplaceVolumetricsTableInstance2",
            layout: {
                relHeight: 0.2,
                relWidth: 1,
                relX: 0,
                relY: 0.8,
            },
            syncedSettings: [SyncSettingKey.INPLACE_VOLUMES_FILTER],
            /*
            initialState: {
                selectedIdentifierValueCriteria: IdentifierValueCriteria.ALLOW_INTERSECTION,
            },
            */
        }),
        createTemplateModuleInstance("ParameterResponseCrossPlot", {
            instanceRef: "MyParameterResponseCrossPlotInstance",
            layout: {
                relHeight: 0.4,
                relWidth: 0.5,
                relX: 0,
                relY: 0.4,
            },

            dataChannelsToInitialSettingsMapping: {
                channelResponse: {
                    listensToInstanceRef: "MainInplaceVolumesPlotInstance",
                    kindOfKey: KeyKind.REALIZATION,
                    channelIdString: ChannelIds.RESPONSE_PER_REAL,
                },
            },
            /*
            initialState: {
                plotType: CrossPlotType.ParameterResponseCrossPlot,
                crossPlottingType: KeyKind.REALIZATION,
            },
            */
            syncedSettings: [SyncSettingKey.PARAMETER],
        }),
        createTemplateModuleInstance("ParameterResponseCorrelationBarPlot", {
            instanceRef: "MyParameterCorrelationPlotInstance",
            layout: {
                relHeight: 0.8,
                relWidth: 0.5,
                relX: 0.5,
                relY: 0,
            },

            dataChannelsToInitialSettingsMapping: {
                channelResponse: {
                    listensToInstanceRef: "MainInplaceVolumesPlotInstance",
                    kindOfKey: KeyKind.REALIZATION,
                    channelIdString: ChannelIds.RESPONSE_PER_REAL,
                },
            },
            /*
            initialState: {
                crossPlottingType: KeyKind.REALIZATION,
                showLabels: true,
                numParams: 10,
            },
            */
            syncedSettings: [SyncSettingKey.PARAMETER],
        }),
    ],
};

TemplateRegistry.registerTemplate(template);
