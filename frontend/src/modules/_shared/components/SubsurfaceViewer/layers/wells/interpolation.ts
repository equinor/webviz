import { WellPoint } from "./data";

function interpolatePoint(start: WellPoint, end: WellPoint, targetZ: number): WellPoint {
    const ratio = (targetZ - start.z) / (end.z - start.z);
    return {
        x: start.x + ratio * (end.x - start.x),
        y: start.y + ratio * (end.y - start.y),
        z: targetZ,
        md: start.md + ratio * (end.md - start.md),
    };
}
export function filterAndInterpolateWellPath(wellPath: WellPoint[], topZ: number, baseZ: number): WellPoint[] {
    let startIndex = -1,
        endIndex = -1;
    let startInterpolated: WellPoint | null = null,
        endInterpolated: WellPoint | null = null;

    if (topZ > baseZ) {
        [topZ, baseZ] = [baseZ, topZ];
    }

    for (let i = 0; i < wellPath.length - 1; i++) {
        const current = wellPath[i];
        const next = wellPath[i + 1];

        if ((current.z <= topZ && next.z >= topZ) || (current.z >= topZ && next.z <= topZ)) {
            startIndex = i;
            startInterpolated = interpolatePoint(current, next, topZ);
        }

        if ((current.z <= baseZ && next.z >= baseZ) || (current.z >= baseZ && next.z <= baseZ)) {
            endIndex = i;
            endInterpolated = interpolatePoint(current, next, baseZ);
            break;
        }
    }

    if (startIndex === -1 || endIndex === -1) {
        wellPath;
    }

    const newPath = wellPath.slice(startIndex + 1, endIndex + 1);

    if (startInterpolated !== null) {
        newPath.unshift(startInterpolated);
    }

    if (endInterpolated !== null) {
        newPath.push(endInterpolated);
    }

    return newPath;
}
