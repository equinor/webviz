/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * (x, y) points defining a polyline in domain coordinate system, to retrieve intersection of a surface, with a cumulative length
 * between at each (x, y)-point coordinates in domain coordinate system.
 *
 * Expect equal number of x- and y-points.
 *
 * x_points: X-coordinates of polyline points.
 * y_points: Y-coordinates of polyline points.
 * cum_lengths: Cumulative lengths of the polyline segments, i.e. the length of the polyline up to each (x,y) point.
 *
 * The cumulative lengths can be e.g. measured depth along a well path.
 *
 * Note: Coordinates are in domain coordinate system (UTM)
 *
 * Note: Verify if cum_lengths is necessary with respect to xtgeo
 */
export type SurfaceIntersectionCumulativeLengthPolyline = {
    x_points: Array<number>;
    y_points: Array<number>;
    cum_lengths: Array<number>;
};

