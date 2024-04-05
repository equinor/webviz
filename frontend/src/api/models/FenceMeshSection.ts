/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { B64FloatArray } from './B64FloatArray';
import type { B64UintArray } from './B64UintArray';
export type FenceMeshSection = {
    vertices_uz_b64arr: B64FloatArray;
    poly_indices_b64arr: B64UintArray;
    vertices_per_poly_b64arr: B64UintArray;
    poly_source_cell_indices_b64arr: B64UintArray;
    poly_props_b64arr: B64FloatArray;
    start_utm_x: number;
    start_utm_y: number;
    end_utm_x: number;
    end_utm_y: number;
};

