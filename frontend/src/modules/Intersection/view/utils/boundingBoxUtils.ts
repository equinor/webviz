import type { BBox } from "@lib/utils/bbox";

/**
 * Create bound box for a projected wellbore path and chosen extension length.
 *
 * wellborePath: 2D coordinates of the wellbore path
 * extensionLength: length to extend the bound box in each direction
 */
export function createBBoxForWellborePath(wellborePath: number[][], extensionLength: number): BBox {
    const minX = Math.min(...wellborePath.map((point) => point[0]));
    const maxX = Math.max(...wellborePath.map((point) => point[0]));
    const minY = Math.min(...wellborePath.map((point) => point[1]));
    const maxY = Math.max(...wellborePath.map((point) => point[1]));

    return {
        min: {
            x: minX - extensionLength,
            y: minY,
            z: 0.0,
        },
        max: {
            x: maxX + extensionLength,
            y: maxY,
            z: 0.0,
        },
    } as BBox;
}
