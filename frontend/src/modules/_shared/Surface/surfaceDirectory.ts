import type { SurfaceAttributeType_api, SurfaceMetaSet_api, SurfaceMeta_api } from "@api";
import { SurfaceTimeType_api } from "@api";

import type { SurfaceAttribute } from "./surfaceAddress";
import { dedupeSurfaceAttributes, getSurfaceAttributeDisplayLabel, isSameAttribute } from "./surfaceAttribute";

export enum SurfaceTimeType {
    None = "None",
    TimePoint = "TimePoint",
    Interval = "Interval",
}

export class SurfaceDirectoryOptions {
    timeType: SurfaceTimeType = SurfaceTimeType.None;
    realizationMetaSet?: SurfaceMetaSet_api;
    observedMetaSet?: SurfaceMetaSet_api;
    useObservedSurfaces?: boolean = false;
    includeAttributeTypes?: SurfaceAttributeType_api[];
    excludeAttributeTypes?: SurfaceAttributeType_api[];
}

// Class responsible for managing a directory of surfaces.
export class SurfaceDirectory {
    private _surfaceList: SurfaceMeta_api[] = [];
    private _isoDateOrIntervalStringArr: string[] = [];
    private _surfNamesInStratOrder: string[] = [];

    // Constructs a SurfaceDirectory with optional content filter criteria.
    constructor(options: SurfaceDirectoryOptions) {
        const srcMetaSet = options.useObservedSurfaces ? options.observedMetaSet : options.realizationMetaSet;
        if (!srcMetaSet) {
            return;
        }

        let filteredList = filterOnTimeType(srcMetaSet.surfaces, options.timeType);

        if (options.includeAttributeTypes && options.includeAttributeTypes.length > 0) {
            const includeAttributeTypes = options.includeAttributeTypes;
            filteredList = filteredList.filter((surface) => includeAttributeTypes.includes(surface.attribute_type));
        }
        if (options.excludeAttributeTypes && options.excludeAttributeTypes.length) {
            const excludeAttributeTypes = options.excludeAttributeTypes;
            filteredList = filteredList.filter((surface) => !excludeAttributeTypes.includes(surface.attribute_type));
        }

        if (options.useObservedSurfaces) {
            filteredList = filteredList.filter((surface) => surface.is_observation);
        } else {
            filteredList = filteredList.filter((surface) => !surface.is_observation);
        }

        this._surfaceList = filteredList;
        this._surfNamesInStratOrder = srcMetaSet.surface_names_in_strat_order;

        if (options.timeType === SurfaceTimeType.TimePoint) {
            this._isoDateOrIntervalStringArr = srcMetaSet.time_points_iso_str;
        } else if (options.timeType === SurfaceTimeType.Interval) {
            this._isoDateOrIntervalStringArr = srcMetaSet.time_intervals_iso_str;
        }
    }

    // Retrieves unique attributes with optional filtering on surface name.
    public getAttributeNames(requireSurfaceName: string | null): SurfaceAttribute[] {
        let filteredList = this._surfaceList;
        if (requireSurfaceName) {
            filteredList = filterOnName(filteredList, requireSurfaceName);
        }
        return dedupeSurfaceAttributes(filteredList.map((surface) => surface.attribute)).sort((a, b) =>
            getSurfaceAttributeDisplayLabel(a).localeCompare(getSurfaceAttributeDisplayLabel(b)),
        );
    }

    // Retrieves intersection of attributes with filtering on surface names.
    public getAttributeNamesIntersection(requireSurfaceNames: string[]): SurfaceAttribute[] {
        if (requireSurfaceNames.length === 0) {
            return [];
        }

        const uniqueRequiredSurfaceNames = [...new Set(requireSurfaceNames)];
        const filteredSurfaceList = this._surfaceList.filter((surface) =>
            uniqueRequiredSurfaceNames.includes(surface.name),
        );
        const uniqueAttributes = dedupeSurfaceAttributes(filteredSurfaceList.map((surface) => surface.attribute));

        if (uniqueAttributes.length === 0) {
            return [];
        }

        // Find attributes present in all required surfaces.
        const attributesIntersection: SurfaceAttribute[] = [];

        for (const attribute of uniqueAttributes) {
            // For each unique required surface name, check if there exist a surface object with the given
            // surface name and attribute.
            const isAttributeInAllRequiredSurfaces = uniqueRequiredSurfaceNames.every((surfaceName) => {
                return (
                    filteredSurfaceList.find(
                        (surface) => surface.name === surfaceName && isSameAttribute(surface.attribute, attribute),
                    ) !== undefined
                );
            });

            if (isAttributeInAllRequiredSurfaces) {
                attributesIntersection.push(attribute);
            }
        }

        return attributesIntersection;
    }

    // Retrieves unique surface names with optional filtering on surface attribute.
    public getSurfaceNames(requireAttribute: SurfaceAttribute | null): string[] {
        const uniqueSurfaceNames = new Set<string>();
        for (const surf of this._surfaceList) {
            if (requireAttribute == null || isSameAttribute(surf.attribute, requireAttribute)) {
                uniqueSurfaceNames.add(surf.name);
            }
        }

        const retArr: string[] = [];
        for (const surfName of this._surfNamesInStratOrder) {
            if (uniqueSurfaceNames.has(surfName)) {
                retArr.push(surfName);
            }
        }

        return retArr;
    }

    // Retrieves unique time points or intervals
    public getTimeOrIntervalStrings(): string[] {
        return this._isoDateOrIntervalStringArr.sort();
    }

    // Checks if a given name and attribute pair exists.
    public nameAttributePairExists(surfaceName: string | null, attribute: SurfaceAttribute | null): boolean {
        if (!attribute || !surfaceName) return false;
        return this._surfaceList.some(
            (surface) => surface.name === surfaceName && isSameAttribute(surface.attribute, attribute),
        );
    }

    // // Get min/max value for a given surface name and attribute.
    // public getMinMax(
    //     stratigraphicName: string | null,
    //     surfaceAttribute: string | null,
    // ): { min: number; max: number } {
    //     if (!surfaceAttribute || !stratigraphicName) return { min: 0, max: 0 };

    //     const filteredList = this.filterOnAttribute(this._surfaceList, surfaceAttribute);
    //     filteredList = this.filterOnName(filteredList, stratigraphicName);
    //     const min = Math.min(...filteredList.map((surface) => surface.value_min));
    //     const max = Math.max(...filteredList.map((surface) => surface.value_max));
    //     return { min, max };
    // }
}

// Filters directory based on time type.
function filterOnTimeType(surfaceList: SurfaceMeta_api[], timeType: SurfaceTimeType): SurfaceMeta_api[] {
    switch (timeType) {
        case SurfaceTimeType.None:
            return surfaceList.filter((surface) => surface.time_type === SurfaceTimeType_api.NO_TIME);
        case SurfaceTimeType.TimePoint:
            return surfaceList.filter((surface) => surface.time_type === SurfaceTimeType_api.TIME_POINT);
        case SurfaceTimeType.Interval:
            return surfaceList.filter((surface) => surface.time_type === SurfaceTimeType_api.INTERVAL);
        default:
            throw new Error("Invalid TimeType");
    }
}

// Filters directory based on a specific surface attribute.
// function filterOnAttribute(surfaceList: SurfaceMeta_api[], surfaceAttribute: string): SurfaceMeta_api[] {
//     return surfaceList.filter((surface) => surface.attribute_name === surfaceAttribute);
// }

// Filters directory based on a specific surface name.
function filterOnName(surfaceList: SurfaceMeta_api[], surfaceName: string): SurfaceMeta_api[] {
    return surfaceList.filter((surface) => surface.name === surfaceName);
}
