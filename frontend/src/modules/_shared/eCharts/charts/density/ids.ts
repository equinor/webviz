import { makeSeriesId } from "../../core/seriesId";

export const DENSITY_CATEGORY = "density";

export type DensityRole = "primary" | "memberPoints";

export function makeDensitySeriesId(
    traceName: string,
    role: DensityRole,
    axisIndex: number
): string {
    return makeSeriesId({ chartType: DENSITY_CATEGORY, role, name: traceName, subKey: "", axisIndex });
}