export const BAR_CATEGORY = "bar";

export function makeBarSeriesId(traceName: string, qualifier: string, axisIndex: number): string {
    return `${BAR_CATEGORY}:${traceName}:${qualifier}:${axisIndex}`;
}