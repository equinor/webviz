import { SeismicCubeMeta_api } from "@api";
import { isIsoStringInterval } from "@framework/utils/timestampUtils";

// Time type for seismic directory.
export enum TimeType {
    TimePoint = "TimePoint",
    Interval = "Interval",
}

export type SeismicCubeDirectoryOptions = {
    seismicCubeMetaArray: SeismicCubeMeta_api[];
    timeType: TimeType;
    useObservedSeismicCubes?: boolean;
};

// Class responsible for managing a directory of seismic cubes.
export class SeismicCubeDirectory {
    private _seismicCubeList: SeismicCubeMeta_api[] = [];

    // Constructs a SeismicCubeDirectory with optional content filter criteria.
    constructor(options: SeismicCubeDirectoryOptions) {
        if (!options) return;

        let filteredList = filterSeismicCubeMetaArrayOnTimeType(options.seismicCubeMetaArray, options.timeType);

        if (options.useObservedSeismicCubes) {
            filteredList = filteredList.filter((cube) => cube.is_observation);
        } else {
            filteredList = filteredList.filter((cube) => !cube.is_observation);
        }

        this._seismicCubeList = filteredList;
    }

    public getAttributeNames(): string[] {
        return [...new Set(this._seismicCubeList.map((cube) => cube.seismic_attribute))].sort();
    }

    public getTimeOrIntervalStrings(requireAttributeName?: string): string[] {
        if (requireAttributeName) {
            const attributeDateOrIntervalStrings = this._seismicCubeList
                .filter((cube) => cube.seismic_attribute === requireAttributeName)
                .map((cube) => cube.iso_date_or_interval);
            return [...new Set(attributeDateOrIntervalStrings)].sort();
        }

        return [...new Set(this._seismicCubeList.map((cube) => cube.iso_date_or_interval))].sort();
    }
}

// Internal utility to filter directory based on time type.
function filterSeismicCubeMetaArrayOnTimeType(
    seismicCubeMetaArray: SeismicCubeMeta_api[],
    timeType: TimeType
): SeismicCubeMeta_api[] {
    switch (timeType) {
        case TimeType.TimePoint:
            return seismicCubeMetaArray.filter(
                (cube) => cube.iso_date_or_interval && !isIsoStringInterval(cube.iso_date_or_interval)
            );
        case TimeType.Interval:
            return seismicCubeMetaArray.filter(
                (cube) => cube.iso_date_or_interval && isIsoStringInterval(cube.iso_date_or_interval)
            );
        default:
            throw new Error("Invalid TimeType");
    }
}
