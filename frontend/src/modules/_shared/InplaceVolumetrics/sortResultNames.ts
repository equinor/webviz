import { InplaceVolumetricResultName_api } from "@api";
import { ORDERED_VOLUME_DEFINITIONS } from "@assets/volumeDefinitions";

function sortResultNamesGeneric<T extends string>(resultNames: T[]): T[] {
    const sortedResultNames: T[] = [];
    const resultNamesSet = new Set(resultNames);

    for (const volumeDefinition in ORDERED_VOLUME_DEFINITIONS) {
        const volumeDefinitionAbbreviation = volumeDefinition as T;
        if (resultNamesSet.has(volumeDefinitionAbbreviation)) {
            sortedResultNames.push(volumeDefinitionAbbreviation);
            resultNamesSet.delete(volumeDefinitionAbbreviation);
        }
    }

    return sortedResultNames.concat(Array.from(resultNamesSet));
}

export function sortResultNames(resultNames: InplaceVolumetricResultName_api[]): InplaceVolumetricResultName_api[] {
    return sortResultNamesGeneric(resultNames);
}

export function sortResultNameStrings(resultNames: string[]): string[] {
    return sortResultNamesGeneric(resultNames);
}
