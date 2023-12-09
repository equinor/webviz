/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

/**
 * (x, y) points defining a polyline in domain coordinate system, to retrieve fence of seismic data.
 *
 * Expect equal number of x- and y-points.
 *
 * Note: Coordinates are in domain coordinate system (UTM).
 *
 * NOTE:
 * - Verify coordinates are in domain coordinate system (UTM)?
 * - Consider points_xy: List[float] - i.e. array with [x1, y1, x2, y2, ..., xn, yn] instead of x_points and y_points arrays?
 * - Ensure equal length of x_points and y_points arrays?
 */
export type SeismicFencePolyline = {
    x_points: Array<number>;
    y_points: Array<number>;
};

