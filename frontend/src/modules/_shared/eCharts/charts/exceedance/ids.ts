import { makeSeriesId } from "../../core/seriesId";

export const EXCEEDANCE_CATEGORY = "exceedance";

export type ExceedanceRole = "primary";

export function makeExceedanceSeriesId(
    traceName: string,
    role: ExceedanceRole,
    axisIndex: number
): string {
    return makeSeriesId({ chartType: EXCEEDANCE_CATEGORY, role, name: traceName, subKey: "", axisIndex });
}