import { SyncSettingKey } from "@framework/SyncSettings";
import type { Template } from "@framework/TemplateRegistry";
import { createTemplateModuleInstance, TemplateRegistry } from "@framework/TemplateRegistry";
import { KeyKind } from "@framework/types/dataChannnel";
import { PlotType } from "@modules/DistributionPlot/typesAndEnums";
import { MEASURE_CHANNEL_ID_MAP } from "@modules/EconomicScreening/channelDefs";
import { EconomicMeasure } from "@modules/EconomicScreening/typesAndEnums";

const template: Template = {
    name: "Discounted production screening",
    description: "Discounted production distributions for regular or delta ensembles.",
    moduleInstances: [
        createTemplateModuleInstance("EconomicScreening", {
            instanceRef: "EconomicScreeningInstance",
            layout: { relHeight: 0.6, relWidth: 1, relX: 0, relY: 0 },
            syncedSettings: [SyncSettingKey.ENSEMBLE],
        }),
        createTemplateModuleInstance("DistributionPlot", {
            instanceRef: "DiscountedOilDistributionInstance",
            layout: { relHeight: 0.4, relWidth: 1, relX: 0, relY: 0.6 },
            syncedSettings: [SyncSettingKey.ENSEMBLE],
            dataChannelsToInitialSettingsMapping: {
                channelX: {
                    listensToInstanceRef: "EconomicScreeningInstance",
                    kindOfKey: KeyKind.REALIZATION,
                    channelIdString: MEASURE_CHANNEL_ID_MAP[EconomicMeasure.DISCOUNTED_OIL_VOLUME],
                },
            },
            initialState: { settings: { plotType: PlotType.Histogram } },
        }),
    ],
};

TemplateRegistry.registerTemplate(template);