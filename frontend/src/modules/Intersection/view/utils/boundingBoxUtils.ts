import { fromNumArray, type BBox } from "@lib/utils/bbox";

/**
 * Create bound box for a projected wellbore path and chosen extension length.
 *
 * wellborePath: 2D coordinates of the wellbore path
 * extensionLength: length to extend the bound box in each direction
 */
export function createBBoxForWellborePath(wellborePath: number[][], extensionLength: number): BBox {
    const minX = Math.min(...wellborePath.map((point) => point[0])) - extensionLength;
    const maxX = Math.max(...wellborePath.map((point) => point[0])) + extensionLength;
    const minY = Math.min(...wellborePath.map((point) => point[1]));
    const maxY = Math.max(...wellborePath.map((point) => point[1]));

    return fromNumArray([minX, minY, 0.0, maxX, maxY, 0.0]);
}
