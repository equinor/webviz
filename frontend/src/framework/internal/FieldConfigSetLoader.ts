import { FieldConfig, FieldConfigSet } from "@framework/FieldConfigs";

import Ajv, { ErrorObject, JSONSchemaType } from "ajv";

const CONFIG_JSON_SCHEMA: JSONSchemaType<FieldConfig> = {
    type: "object",
    properties: {
        fieldIdentifier: { type: "string" },
        range: {
            type: "array",
            items: [{ type: "number" }, { type: "number" }],
            minItems: 2,
            maxItems: 2,
        },
    },
    required: ["fieldIdentifier"],
    additionalProperties: false,
};

const validateConfig = new Ajv().compile(CONFIG_JSON_SCHEMA);

function stringifyConfigValidationErrors(errors: ErrorObject<string, Record<string, any>, unknown>[]): string {
    return errors.map((error) => JSON.stringify(error)).join("\n");
}

type LoadConfigFromFileResult = {
    config: FieldConfig | null;
    error: Error | null;
};

async function loadConfigFromFile(fieldIdentifier: string): Promise<LoadConfigFromFileResult> {
    const result: LoadConfigFromFileResult = {
        config: null,
        error: null,
    };

    try {
        const content = await import(`@assets/field-configs/${fieldIdentifier}.json?init`);
        if (!validateConfig(content.default)) {
            result.error = new Error(
                `Invalid format in config file '${fieldIdentifier}.json':\n${stringifyConfigValidationErrors(
                    validateConfig.errors ?? []
                )}`
            );
        }

        if (content.default.fieldIdentifier !== fieldIdentifier) {
            result.error = new Error(`Field identifier mismatch in config file '${fieldIdentifier}.json'`);
        }
    } catch (error: any) {
        result.error = new Error(`Failed to load config for field '${fieldIdentifier}': ${error.message}`);
    }

    return result;
}

export async function loadFieldConfigs(fieldsToLoadConfigFor: string[]): Promise<FieldConfigSet> {
    const promiseArray: Promise<LoadConfigFromFileResult | null>[] = [];

    for (const field of fieldsToLoadConfigFor) {
        promiseArray.push(loadConfigFromFile(field));
    }

    const results = await Promise.allSettled(promiseArray);

    const configArray: FieldConfig[] = [];
    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const fieldIdentifier = fieldsToLoadConfigFor[i];

        if (result.status === "rejected") {
            console.error(`Error loading config for field '${fieldIdentifier}', dropping config`, result.reason);
            continue;
        }

        const config = result.value?.config;

        if (!config) {
            console.error(`No config found for field '${fieldIdentifier}', dropping config`);
            continue;
        }

        if (config.fieldIdentifier !== fieldIdentifier) {
            console.error(`Field identifier mismatch in config for field '${fieldIdentifier}', dropping config`);
            continue;
        }

        configArray.push(config);
    }

    return new FieldConfigSet(configArray);
}
