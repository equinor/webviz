import { SeismicCubeMeta_api } from "@api";
import { isIsoStringInterval } from "@framework/utils/timestampUtils";

// Time type for seismic cubes.
export enum SeismicTimeType {
    TimePoint = "TimePoint",
    Interval = "Interval",
}

export type SeismicCubeMetaDirectoryOptions = {
    seismicCubeMetaList: SeismicCubeMeta_api[];
    timeType: SeismicTimeType;
    useObservedSeismicCubes?: boolean;
};

// Class responsible for managing a list of seismic cube meta.
export class SeismicCubeMetaDirectory {
    private _seismicCubeList: SeismicCubeMeta_api[] = [];

    // Constructs a SeismicCubeDirectory with optional content filter criteria.
    constructor(options: SeismicCubeMetaDirectoryOptions) {
        if (!options) return;

        let filteredList = filterSeismicCubeMetaListOnTimeType(options.seismicCubeMetaList, options.timeType);

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
function filterSeismicCubeMetaListOnTimeType(
    seismicCubeMetaList: SeismicCubeMeta_api[],
    timeType: SeismicTimeType
): SeismicCubeMeta_api[] {
    switch (timeType) {
        case SeismicTimeType.TimePoint:
            return seismicCubeMetaList.filter(
                (cube) => cube.iso_date_or_interval && !isIsoStringInterval(cube.iso_date_or_interval)
            );
        case SeismicTimeType.Interval:
            return seismicCubeMetaList.filter(
                (cube) => cube.iso_date_or_interval && isIsoStringInterval(cube.iso_date_or_interval)
            );
        default:
            throw new Error("Invalid TimeType");
    }
}
