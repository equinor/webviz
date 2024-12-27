/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { B64FloatArray } from './B64FloatArray';
import type { B64UintArray } from './B64UintArray';
export type Grid3dGeometry = {
    polys_b64arr: B64UintArray;
    points_b64arr: B64FloatArray;
    poly_source_cell_indices_b64arr: B64UintArray;
    origin_utm_x: number;
    origin_utm_y: number;
    xmin: number;
    xmax: number;
    ymin: number;
    ymax: number;
    zmin: number;
    zmax: number;
};

