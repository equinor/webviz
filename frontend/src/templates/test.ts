import type { Template } from "@framework/TemplateRegistry";
import { createTemplateModuleInstance, TemplateRegistry } from "@framework/TemplateRegistry";

const template: Template = {
    name: "Test",
    description: "Testing templates",
    moduleInstances: [
        createTemplateModuleInstance("MyModule", {
            layout: {
                relHeight: 0.5,
                relWidth: 1,
                relX: 0,
                relY: 0,
            },

            initialState: {
                settings: {
                    myData: "value2",
                },
            },
        }),
        createTemplateModuleInstance("2DViewer", {
            layout: {
                relHeight: 0.5,
                relWidth: 1,
                relX: 0,
                relY: 0.5,
            },
            initialState: {
                settings: {
                    fieldIdentifier: "SNORRE",
                },
            },
        }),
    ],
};

TemplateRegistry.registerTemplate(template);
