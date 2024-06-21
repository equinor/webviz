import { SurfaceAttributeType_api, SurfaceMetaSet_api, SurfaceMeta_api, SurfaceTimeType_api } from "@api";

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
        }
        else if (options.timeType === SurfaceTimeType.Interval) {
            this._isoDateOrIntervalStringArr = srcMetaSet.time_intervals_iso_str;
        }
    }

    // Retrieves unique attribute names with optional filtering on surface name.
    public getAttributeNames(requireSurfaceName: string | null): string[] {
        let filteredList = this._surfaceList;
        if (requireSurfaceName) {
            filteredList = filterOnName(filteredList, requireSurfaceName);
        }
        return [...new Set(filteredList.map((surface) => surface.attribute_name))].sort();
    }

    // Retrieves intersection of attribute names with filtering on surface names.
    public getAttributeNamesIntersection(requireSurfaceNames: string[]): string[] {
        if (requireSurfaceNames.length === 0) {
            return [];
        }

        const uniqueRequiredSurfaceNames = [...new Set(requireSurfaceNames)];
        const filteredSurfaceList = this._surfaceList.filter((surface) =>
            uniqueRequiredSurfaceNames.includes(surface.name)
        );
        const uniqueAttributeNames = [...new Set(filteredSurfaceList.map((surface) => surface.attribute_name))].sort();

        if (uniqueAttributeNames.length === 0) {
            return [];
        }

        // Find attribute names present in all required surfaces.
        const attributeNamesIntersection: string[] = [];

        for (const attributeName of uniqueAttributeNames) {
            // For each unique required surface name, check if there exist a surface object with the given
            // surface name and attribute name.
            const isAttributeInAllRequiredSurfaces = uniqueRequiredSurfaceNames.every((surfaceName) => {
                return (
                    filteredSurfaceList.find(
                        (surface) => surface.name === surfaceName && surface.attribute_name === attributeName
                    ) !== undefined
                );
            });

            if (isAttributeInAllRequiredSurfaces) {
                attributeNamesIntersection.push(attributeName);
            }
        }

        return attributeNamesIntersection;
    }

    // Retrieves unique surface names with optional filtering on surface attribute.
    public getSurfaceNames(requireAttributeName: string | null): string[] {
        const uniqueSurfaceNames = new Set<string>();
        for (const surf of this._surfaceList) {
            if (requireAttributeName == null || surf.attribute_name === requireAttributeName) {
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
    public nameAttributePairExists(surfaceName: string | null, attributeName: string | null): boolean {
        if (!attributeName || !surfaceName) return false;
        return this._surfaceList.some(
            (surface) => surface.name === surfaceName && surface.attribute_name === attributeName
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
