/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Definition of a surface intersection made from a set of (x, y) coordinates.
 *
 * name: Name of the surface
 * z_points: Array of z-points (depth values) at the intersection points, i.e. depth value for each (x,y) point.
 * cum_lengths: Cumulative length values at the intersection points, i.e. accumulated length between each element in the z points.
 */
export type SurfaceIntersectionData = {
    name: string;
    z_points: Array<number>;
    cum_lengths: Array<number>;
};

