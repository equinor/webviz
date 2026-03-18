export const EXCEEDANCE_CATEGORY = "exceedance";

export function makeExceedanceSeriesId(traceName: string, qualifier: string, axisIndex: number): string {
    return `${EXCEEDANCE_CATEGORY}:${traceName}:${qualifier}:${axisIndex}`;
}