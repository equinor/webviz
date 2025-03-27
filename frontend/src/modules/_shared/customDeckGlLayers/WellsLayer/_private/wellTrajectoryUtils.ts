import * as vec3 from "@lib/utils/vec3";

function squared_distance(a: vec3.Vec3, b: vec3.Vec3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return dx * dx + dy * dy + dz * dz;
}

function distPointToSegmentSquared(segment: { v: vec3.Vec3; w: vec3.Vec3 }, point: vec3.Vec3): number {
    const l2 = squared_distance(segment.v, segment.w);
    if (l2 === 0) return squared_distance(point, segment.v);
    let t =
        ((point.x - segment.v.x) * (segment.w.x - segment.v.x) +
            (point.y - segment.v.y) * (segment.w.y - segment.v.y) +
            (point.z - segment.v.z) * (segment.w.z - segment.v.z)) /
        l2;
    t = Math.max(0, Math.min(1, t));
    return squared_distance(point, {
        x: segment.v.x + t * (segment.w.x - segment.v.x),
        y: segment.v.y + t * (segment.w.y - segment.v.y),
        z: segment.v.z + t * (segment.w.z - segment.v.z),
    });
}

function getSegmentIndex(coord: vec3.Vec3, path: vec3.Vec3[]): number {
    let minD = Number.MAX_VALUE;
    let segmentIndex = 0;
    for (let i = 0; i < path.length - 1; i++) {
        const d = distPointToSegmentSquared({ v: path[i], w: path[i + 1] }, coord);
        if (d > minD) continue;

        segmentIndex = i;
        minD = d;
    }
    return segmentIndex;
}

function interpolateDataOnTrajectory(coord: vec3.Vec3, data: number[], trajectory: vec3.Vec3[]): number {
    // if number of data points in less than 1 or
    // length of data and trajectory are different we cannot interpolate.
    if (data.length <= 1 || data.length != trajectory.length) return -1;

    // Identify closest well path leg to coord.
    const segmentIndex = getSegmentIndex(coord, trajectory);

    const index0 = segmentIndex;
    const index1 = index0 + 1;

    // Get the nearest data.
    const data0 = data[index0];
    const data1 = data[index1];

    // Get the nearest survey points.
    const survey0 = trajectory[index0];
    const survey1 = trajectory[index1];

    const dv = vec3.distance(survey0, survey1) as number;
    if (dv === 0) {
        return -1;
    }

    // Calculate the scalar projection onto segment.
    const v0 = vec3.subtract(coord, survey0);
    const v1 = vec3.subtract(survey1, survey0);

    // scalar_projection in interval [0,1]
    const scalar_projection: number = vec3.dot(v0, v1) / (dv * dv);

    // Interpolate data.
    return data0 * (1.0 - scalar_projection) + data1 * scalar_projection;
}

export function getMd(coord: vec3.Vec3, mdArray: number[], trajectory: vec3.Vec3[]): number | null {
    return interpolateDataOnTrajectory(coord, mdArray, trajectory);
}

export function getCoordinateForMd(md: number, mdArray: number[], trajectory: vec3.Vec3[]): vec3.Vec3 | null {
    const numPoints = mdArray.length;
    if (numPoints < 2) {
        return null;
    }

    let segmentIndex = 0;
    for (let i = 0; i < numPoints - 1; i++) {
        if (mdArray[i] <= md && md <= mdArray[i + 1]) {
            segmentIndex = i;
            break;
        }
    }

    const md0 = mdArray[segmentIndex];
    const md1 = mdArray[segmentIndex + 1];

    const survey0 = trajectory[segmentIndex];
    const survey1 = trajectory[segmentIndex + 1];

    const dv = vec3.distance(survey0, survey1) as number;
    if (dv === 0) {
        return null;
    }

    const scalar_projection = (md - md0) / (md1 - md0);

    return {
        x: survey0.x + scalar_projection * (survey1.x - survey0.x),
        y: survey0.y + scalar_projection * (survey1.y - survey0.y),
        z: survey0.z + scalar_projection * (survey1.z - survey0.z),
    };
}
