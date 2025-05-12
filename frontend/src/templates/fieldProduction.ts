import type { Template } from "@framework/TemplateRegistry";
import { TemplateRegistry } from "@framework/TemplateRegistry";
import { VisualizationMode } from "@modules/SimulationTimeSeries/typesAndEnums";

const template: Template = {
    description: "Total oil/gas production",
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
                selectedVectorTags: ["FOPT", "FGPT", "FOPR", "FGPR"],
                visualizationMode: VisualizationMode.STATISTICAL_FANCHART,
            },
        },
    ],
};

TemplateRegistry.registerTemplate("Field production", template);
