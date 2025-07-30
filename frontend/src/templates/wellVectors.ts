import type { Template } from "@framework/TemplateRegistry";
import { TemplateRegistry } from "@framework/TemplateRegistry";
import { VisualizationMode } from "@modules/SimulationTimeSeries/typesAndEnums";

const template: Template = {
    name: "Single Well Production",
    description: "Water cut, gas oil ratio, water bottom hole pressure and oil production rate for a well",
    moduleInstances: [
        {
            instanceRef: "MainSimulationTimeSeriesInstance",
            moduleName: "SimulationTimeSeries",
            layout: {
                relHeight: 1,
                relWidth: 1,
                relX: 0,
                relY: 0,
            },

            initialSettings: {
                selectedVectorTags: ["WWCT:A1", "WGOR:A1", "WBHP:A1", "WOPT:A1"],
                visualizationMode: VisualizationMode.STATISTICAL_FANCHART,
            },
        },
    ],
};

TemplateRegistry.registerTemplate(template);
