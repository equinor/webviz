import { v4 } from "uuid";

import { makeTrackPlot } from "./logViewerTemplate";

import { TemplateTrackConfig } from "../types";

/**
 * Calculates a data-blob download uri from a list of viewer track configuration objects
 * @param templateTrackConfigs A list of log viewer track configs
 * @returns Uri-string to a downloadable json-blob
 */
export function configToJsonDataBlob(templateTrackConfigs: TemplateTrackConfig[]): string | null {
    if (!templateTrackConfigs.length) return null;

    const configJsonString = JSON.stringify(templateTrackConfigs);

    return `data:text/json;charset=utf-8,${encodeURIComponent(configJsonString)}`;
}

export async function jsonFileToTrackConfigs(file: File): Promise<TemplateTrackConfig[]> {
    if (file.type !== "application/json") throw new Error("Invalid file extension");

    const fileData = await file.text();

    const parsedData = JSON.parse(fileData);

    // Extract expected fields and validate values
    return parsedData.map(transformToTrackConfig);
}

function transformToTrackConfig(obj: any): TemplateTrackConfig {
    // ! Remember to keep this up to date if the config's structure changes
    const requiredFields = {
        title: obj.title,
        plots: obj.plots,
        _type: obj._type,
    };

    const optionalFields = {
        required: obj.required,
        width: obj.width,
        scale: obj.scale,
        domain: obj.domain,
    };

    validateRequiredFields(requiredFields);

    return {
        ...optionalFields,
        _key: v4(),
        _type: requiredFields._type,
        title: requiredFields.title,
        plots: requiredFields.plots.map(makeTrackPlot),
    };
}

function validateRequiredFields<T>(partialObj: Partial<T>): asserts partialObj is T {
    if (Object.values(partialObj).some((v) => v === undefined)) {
        throw new Error("Missing required fields");
    }
}
