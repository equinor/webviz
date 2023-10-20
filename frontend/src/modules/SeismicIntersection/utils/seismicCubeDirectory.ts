import { SeismicCubeMeta_api, SurfaceAttributeType_api } from "@api";
import { isIsoStringInterval } from "@framework/utils/timestampUtils";

export enum TimeType {
    TimePoint = "TimePoint",
    Interval = "Interval",
}

export type SeismicCubeDirectoryOptions = {
    seismicCubeMetas: SeismicCubeMeta_api[];
    timeType: TimeType;
    useObservedSeismicCubes?: boolean;
};

// Class responsible for managing a directory of seismic cubes.
export class SeismicCubeDirectory {
    private _seismicCubeList: SeismicCubeMeta_api[] = [];

    // Constructs a SeismicCubeDirectory with optional content filter criteria.
    constructor(options: SeismicCubeDirectoryOptions | null) {
        if (!options) return;

        let filteredList = filterOnTimeType(options.seismicCubeMetas, options.timeType);

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
}

// Filters directory based on time type.
function filterOnTimeType(seismicCubeList: SeismicCubeMeta_api[], timeType: TimeType): SeismicCubeMeta_api[] {
    switch (timeType) {
        case TimeType.TimePoint:
            return seismicCubeList.filter(
                (cube) => cube.iso_date_or_interval && !isIsoStringInterval(cube.iso_date_or_interval)
            );
        case TimeType.Interval:
            return seismicCubeList.filter(
                (cube) => cube.iso_date_or_interval && isIsoStringInterval(cube.iso_date_or_interval)
            );
        default:
            throw new Error("Invalid TimeType");
    }
}
