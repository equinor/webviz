import { StaticSurfaceDirectory_api } from "@api";
import { UseQueryResult } from "@tanstack/react-query";

export class SurfaceDirectoryProvider {
    private _availableNames: string[];
    private _availableAttributes: string[];
    private _valid_attributes_for_name: number[][];

    constructor(surfaceDirectoryQuery: UseQueryResult<StaticSurfaceDirectory_api>, badDataHack: "tops" | "formations") {
        if (surfaceDirectoryQuery.data) {
            const filteredNames: string[] = [];
            const filteredValidAttributesForName: number[][] = [];

            // TODO: This is a hack to filter only the tops and bases from the surface directory
            if (badDataHack == "tops") {
                surfaceDirectoryQuery.data.names.forEach((item, idx) => {
                    if (
                        item.includes("Top") ||
                        item.includes("top") ||
                        item.includes("TOP") ||
                        item.includes("Base") ||
                        item.includes("base") ||
                        item.includes("BASE")
                    ) {
                        filteredNames.push(item);
                        filteredValidAttributesForName.push(surfaceDirectoryQuery.data.valid_attributes_for_name[idx]);
                    }
                });
            }
            // TODO: This is a hack to filter only the formations from the surface directory
            else {
                surfaceDirectoryQuery.data.names.forEach((item, idx) => {
                    if (
                        !item.includes("Top") &&
                        !item.includes("top") &&
                        !item.includes("TOP") &&
                        !item.includes("Base") &&
                        !item.includes("base") &&
                        !item.includes("BASE")
                    ) {
                        filteredNames.push(item);
                        filteredValidAttributesForName.push(surfaceDirectoryQuery.data.valid_attributes_for_name[idx]);
                    }
                });
            }

            this._availableAttributes = surfaceDirectoryQuery.data.attributes;
            this._availableNames = filteredNames.length > 0 ? filteredNames : surfaceDirectoryQuery.data.names;
            this._valid_attributes_for_name =
                filteredValidAttributesForName.length > 0
                    ? filteredValidAttributesForName
                    : surfaceDirectoryQuery.data.valid_attributes_for_name;
        } else {
            this._availableNames = [];
            this._availableAttributes = [];
            this._valid_attributes_for_name = [];
        }
    }

    surfaceNames(): string[] {
        return this._availableNames;
    }
    attributesForSurfaceName(surfName: string | null): string[] {
        if (!surfName) {
            return [];
        }
        const idxOfSurfName = this._availableNames.indexOf(surfName);
        if (idxOfSurfName == -1) {
            return [];
        }

        const attrIndices = this._valid_attributes_for_name[idxOfSurfName];
        const attrNames: string[] = [];
        for (const idx of attrIndices) {
            attrNames.push(this._availableAttributes[idx]);
        }

        return attrNames;
    }
    validateOrResetSurfaceName(surfaceName: string | null): string | null {
        if (!this._availableNames) {
            return null;
        }

        if (surfaceName && this._availableNames.includes(surfaceName)) {
            return surfaceName;
        }
        return this._availableNames[0];
    }
    validateOrResetSurfaceAttribute(surfaceName: string | null, surfaceAttribute: string | null): string | null {
        if (!surfaceName) {
            return null;
        }
        const validAttrNames = this.attributesForSurfaceName(surfaceName);

        if (validAttrNames.length == 0) {
            return null;
        }

        if (surfaceAttribute && validAttrNames.includes(surfaceAttribute)) {
            return surfaceAttribute;
        }

        return validAttrNames[0];
    }
}
