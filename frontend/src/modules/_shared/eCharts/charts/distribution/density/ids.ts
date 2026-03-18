export const DENSITY_CATEGORY = "density";

export function makeDensitySeriesId(traceName: string, qualifier: string, axisIndex: number): string {
    return `${DENSITY_CATEGORY}:${traceName}:${qualifier}:${axisIndex}`;
}