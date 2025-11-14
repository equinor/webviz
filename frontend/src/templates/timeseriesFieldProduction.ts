import type { Template } from "@framework/TemplateRegistry";
import { createTemplateModuleInstance, TemplateRegistry } from "@framework/TemplateRegistry";

const template: Template = {
    name: "Field production",
    description: "Total oil/gas production",
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
                selectedVectorTags: ["FOPT", "FGPT", "FOPR", "FGPR"],
                visualizationMode: VisualizationMode.STATISTICAL_FANCHART,
            },
            */
        }),
    ],
};

TemplateRegistry.registerTemplate(template);
