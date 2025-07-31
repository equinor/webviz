import type { Template } from "@framework/TemplateRegistry";
import { createTemplateModuleInstance, TemplateRegistry } from "@framework/TemplateRegistry";

const template: Template = {
    name: "Single Well Production",
    description: "Water cut, gas oil ratio, water bottom hole pressure and oil production rate for a well",
    moduleInstances: [
        createTemplateModuleInstance("SimulationTimeSeries", {
            instanceRef: "MainSimulationTimeSeriesInstance",
            layout: {
                relHeight: 1,
                relWidth: 1,
                relX: 0,
                relY: 0,
            },
            /*
            initialState: {
                selectedVectorTags: ["WWCT:A1", "WGOR:A1", "WBHP:A1", "WOPT:A1"],
                visualizationMode: VisualizationMode.STATISTICAL_FANCHART,
            },
            */
        }),
    ],
};

TemplateRegistry.registerTemplate(template);
