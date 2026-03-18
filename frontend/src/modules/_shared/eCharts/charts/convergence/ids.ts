export const CONVERGENCE_CATEGORY = "convergence";

export function makeConvergenceSeriesId(traceName: string, qualifier: string, axisIndex: number): string {
    return `${CONVERGENCE_CATEGORY}:${traceName}:${qualifier}:${axisIndex}`;
}