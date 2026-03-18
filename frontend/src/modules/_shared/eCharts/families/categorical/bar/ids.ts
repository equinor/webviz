import { makeSeriesId } from "../../../utils/seriesId";

export const BAR_CATEGORY = "bar";

export function makeBarSeriesId(traceName: string, qualifier: string, axisIndex: number): string {
    return makeSeriesId(BAR_CATEGORY, traceName, qualifier, axisIndex);
}