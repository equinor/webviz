import { Viewport } from "@deck.gl/core";

import { PI, PI2, PI4, PI8, Vec2, Vec3 } from "./definitions";

export function normalizeVec2(v: Vec2): Vec2 {
    const l = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
    v[0] = v[0] / l;
    v[1] = v[1] / l;
    return v;
}

export function subVec2(v1: Vec2, v2: Vec2): Vec2 {
    return [v1[0] - v2[0], v1[1] - v2[1]];
}

export const labelAngles = [
    /* 0 */ 0,
    /* 1 */ PI4,
    /* 2 */ PI2,
    /* 3 */ PI - PI4,
    /* 4 */ PI,
    /* 5 */ -PI + PI4,
    /* 6 */ -PI2,
    /* 7 */ -PI4,
];
/**
 * 0 = [-] annotation is pointing approx. horizontally
 * 1 = [/] annotation is pointing approx. diagonally (from lower left to upper right)
 * 2 = [|] annotation is pointing approx. vertically
 * 3 = [\] annotation is pointing approx. diagonally (from upper left to lower right)
 */
export const labelAnglesMap = [
    [2, 6],
    [7, 3],
    [0, 4],
    [1, 5],
];

export const getLabelQuadrant = (
    originScreen: Vec3,
    origin3d: Vec3,
    direction3d: Vec3,
    projectFunc: Viewport["project"],
) => {
    const position = [
        origin3d[0] + direction3d[0] * 100,
        origin3d[1] + direction3d[1] * 100,
        origin3d[2] + direction3d[2] * 100,
    ];

    const positionScreen = projectFunc(position);

    const directionScreen = normalizeVec2(
        subVec2([positionScreen[0], positionScreen[1]], [originScreen[0], originScreen[1]]),
    );

    let angle = Math.atan2(directionScreen[1], directionScreen[0]);
    if (angle < 0) angle = PI + angle; // normalize to 0-PI

    const quadrant = Math.floor((angle + PI8) / PI4) % 4;

    return quadrant;
};

export const occlusionTest = (
    ndc: Vec3,
    depthBufferWidth: number,
    depthBufferHeight: number,
    depthBuffer: Float32Array,
) => {
    const c = Math.floor((ndc[0] * 0.5 + 0.5) * depthBufferWidth);
    const r = Math.floor((ndc[1] * 0.5 + 0.5) * depthBufferHeight);
    const depth = depthBuffer[r * depthBufferWidth + c] as number;

    return depth > -1 && depth < ndc[2];
};

export function edgeOfRectangle(rect: Vec2, theta: number): Vec2 {
    while (theta < -PI) {
        theta += 2 * PI;
    }

    while (theta > PI) {
        theta -= 2 * PI;
    }

    const rectAtan = Math.atan2(rect[1], rect[0]);
    const tanTheta = Math.tan(theta);
    let region;

    if (theta > -rectAtan && theta <= rectAtan) {
        region = 1;
    } else if (theta > rectAtan && theta <= Math.PI - rectAtan) {
        region = 2;
    } else if (theta > Math.PI - rectAtan || theta <= -(Math.PI - rectAtan)) {
        region = 3;
    } else {
        region = 4;
    }

    const edgePoint: Vec2 = [0, 0];
    let xFactor = 1;
    let yFactor = 1;

    switch (region) {
        case 1:
            yFactor = -1;
            break;
        case 2:
            yFactor = -1;
            break;
        case 3:
            xFactor = -1;
            break;
        case 4:
            xFactor = -1;
            break;
    }

    if (region === 1 || region === 3) {
        edgePoint[0] += xFactor * (rect[0] / 2); // "Z0"
        edgePoint[1] += yFactor * (rect[0] / 2) * tanTheta;
    } else {
        edgePoint[0] += xFactor * (rect[1] / (2 * tanTheta)); // "Z1"
        edgePoint[1] += yFactor * (rect[1] / 2);
    }

    return edgePoint;
}

export function clamp(value: number, min = 0, max = 1): number {
    if (value < min) return min;
    if (value > max) return max;
    return value;
}

export function mixVec2(v1: Vec2, v2: Vec2, t = 0.5): Vec2 {
    const t2 = 1 - t;
    return [v1[0] * t2 + v2[0] * t, v1[1] * t2 + v2[1] * t];
}

export function calcDistance(v1: Vec3, v2: Vec3): number {
    return Math.sqrt(Math.pow(v1[0] - v2[0], 2) + Math.pow(v1[1] - v2[1], 2) + Math.pow(v1[2] - v2[2], 2));
}
