import { makeSeriesId } from "../../../utils/seriesId";

export const CONVERGENCE_CATEGORY = "convergence";

export function makeConvergenceSeriesId(traceName: string, qualifier: string, axisIndex: number): string {
    return makeSeriesId(CONVERGENCE_CATEGORY, traceName, qualifier, axisIndex);
}