import { SurfacePolygonDirectory_api } from "@api";
import { UseQueryResult } from "@tanstack/react-query";

export class PolygonDirectoryProvider {
    private _availableNames: string[];
    private _availableAttributes: string[];
    private _valid_attributes_for_name: number[][];

    constructor(polygonDirectoryQuery: UseQueryResult<SurfacePolygonDirectory_api>) {
        if (polygonDirectoryQuery.data) {
            this._availableNames = polygonDirectoryQuery.data.names;
            this._availableAttributes = polygonDirectoryQuery.data.attributes;
            this._valid_attributes_for_name = polygonDirectoryQuery.data.valid_attributes_for_name;
        } else {
            this._availableNames = [];
            this._availableAttributes = [];
            this._valid_attributes_for_name = [];
        }
    }

    polygonNames(): string[] {
        return this._availableNames;
    }
    attributesForPolygonName(surfName: string | null): string[] {
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
    validateOrResetPolygonName(polygonName: string | null): string | null {
        if (!this._availableNames) {
            return null;
        }

        if (polygonName && this._availableNames.includes(polygonName)) {
            return polygonName;
        }
        return this._availableNames[0];
    }
    validateOrResetPolygonNameFromSurfaceName(surfaceName: string | null): string | null {
        if (!this._availableNames) {
            return null;
        }
        if (surfaceName && this._availableNames.includes(surfaceName)) {
            return surfaceName;
        }
        return null;
    }
    validateOrResetPolygonAttribute(polygonName: string | null, polygonAttribute: string | null): string | null {
        if (!polygonName) {
            return null;
        }
        const validAttrNames = this.attributesForPolygonName(polygonName);

        if (validAttrNames.length == 0) {
            return null;
        }

        if (polygonAttribute && validAttrNames.includes(polygonAttribute)) {
            return polygonAttribute;
        }

        return validAttrNames[0];
    }
}
