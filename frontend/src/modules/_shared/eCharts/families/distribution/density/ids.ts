import { makeSeriesId } from "../../../utils/seriesId";

export const DENSITY_CATEGORY = "density";

export function makeDensitySeriesId(traceName: string, qualifier: string, axisIndex: number): string {
    return makeSeriesId(DENSITY_CATEGORY, traceName, qualifier, axisIndex);
}