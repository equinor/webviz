import { makeSeriesId } from "../../core/seriesId";

export const BAR_CATEGORY = "bar";

export function makeBarSeriesId(
    traceName: string,
    role: "primary" | "reference",
    axisIndex: number,
    statKey: string = ""
): string {
    return makeSeriesId({ chartType: BAR_CATEGORY, role, name: traceName, subKey: statKey, axisIndex });
}