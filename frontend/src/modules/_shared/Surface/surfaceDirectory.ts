import { SurfaceAttributeType_api, SurfaceMeta_api } from "@api";
import { isIsoStringInterval } from "@framework/utils/timestampUtils";

export enum TimeType {
    None = "None",
    TimePoint = "TimePoint",
    Interval = "Interval",
}

export type SurfaceDirectoryOptions = {
    surfaceMetas: SurfaceMeta_api[];
    timeType: TimeType;
    includeAttributeTypes?: SurfaceAttributeType_api[];
    excludeAttributeTypes?: SurfaceAttributeType_api[];
    useObservedSurfaces?: boolean;
};

// Class responsible for managing a directory of surfaces.
export class SurfaceDirectory {
    private _surfaceList: SurfaceMeta_api[] = [];

    // Constructs a SurfaceDirectory with optional content filter criteria.
    constructor(options: SurfaceDirectoryOptions | null) {
        if (!options) return;

        let filteredList = filterOnTimeType(options.surfaceMetas, options.timeType);

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
    }

    // Retrieves unique attribute names with optional filtering on surface name.
    public getAttributeNames(requireSurfaceName: string | null): string[] {
        let filteredList = this._surfaceList;
        if (requireSurfaceName) {
            filteredList = filterOnName(filteredList, requireSurfaceName);
        }
        return [...new Set(filteredList.map((surface) => surface.attribute_name))].sort();
    }

    // Retrieves unique surface names with optional filtering on surface attribute.
    public getSurfaceNames(requireAttributeName: string | null): string[] {
        let filteredList = this._surfaceList;
        if (requireAttributeName) {
            filteredList = filterOnAttribute(filteredList, requireAttributeName);
        }
        return [...new Set(filteredList.map((surface) => surface.name))];
    }

    // Retrieves unique time points or intervals with optional filtering on surface name and/or attribute.
    public getTimeOrIntervalStrings(requireSurfaceName: string | null, requireAttributeName: string | null): string[] {
        let filteredList = this._surfaceList;

        if (requireSurfaceName || requireAttributeName) {
            filteredList = filteredList.filter((surface) => {
                const matchedOnSurfName = !requireSurfaceName || surface.name === requireSurfaceName;
                const matchedOnAttrName = !requireAttributeName || surface.attribute_name === requireAttributeName;
                return matchedOnSurfName && matchedOnAttrName;
            });
        }
        if (filteredList.length === 0){
            return [];
        }

        const timeOrIntervalsSet: Set<string> = new Set();
        filteredList.forEach((surface) => {
            if (surface.iso_date_or_interval) {
                timeOrIntervalsSet.add(surface.iso_date_or_interval);
            }
        });
        return [...timeOrIntervalsSet].sort();
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
function filterOnTimeType(surfaceList: SurfaceMeta_api[], timeType: TimeType): SurfaceMeta_api[] {
    switch (timeType) {
        case TimeType.None:
            return surfaceList.filter((surface) => !surface.iso_date_or_interval);
        case TimeType.TimePoint:
            return surfaceList.filter(
                (surface) => surface.iso_date_or_interval && !isIsoStringInterval(surface.iso_date_or_interval)
            );
        case TimeType.Interval:
            return surfaceList.filter(
                (surface) => surface.iso_date_or_interval && isIsoStringInterval(surface.iso_date_or_interval)
            );
        default:
            throw new Error("Invalid TimeType");
    }
}

// Filters directory based on a specific surface attribute.
function filterOnAttribute(surfaceList: SurfaceMeta_api[], surfaceAttribute: string): SurfaceMeta_api[] {
    return surfaceList.filter((surface) => surface.attribute_name === surfaceAttribute);
}

// Filters directory based on a specific surface name.
function filterOnName(surfaceList: SurfaceMeta_api[], surfaceName: string): SurfaceMeta_api[] {
    return surfaceList.filter((surface) => surface.name === surfaceName);
}
