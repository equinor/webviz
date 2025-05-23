import type { Viewport } from "@framework/types/viewport";

import type { Bounds } from "../esvIntersection";

/**
 * Validate if the given value is a valid number
 */
export function isValidNumber(value: number): boolean {
    return !Number.isNaN(value) && Number.isFinite(value) && value !== Number.MAX_VALUE && value !== -Number.MAX_VALUE;
}

/**
 * Validate if the given bound consist of valid numbers
 */
export function isBoundValid(bound: [number, number]): boolean {
    return isValidNumber(bound[0]) && isValidNumber(bound[1]);
}

/**
 * Validate if the given bounds consist of valid numbers
 */
export function areBoundsValid(bounds: Bounds): boolean {
    return isBoundValid(bounds.x) && isBoundValid(bounds.y);
}

/**
 * Validate if the given viewport consist of valid numbers
 */
export function isValidViewport(viewport: Viewport): boolean {
    return isValidNumber(viewport[0]) && isValidNumber(viewport[1]) && isValidNumber(viewport[2]);
}
