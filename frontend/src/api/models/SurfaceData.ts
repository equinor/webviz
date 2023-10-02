/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { B64FloatArray } from './B64FloatArray';

export type SurfaceData = {
    x_ori: number;
    y_ori: number;
    x_count: number;
    y_count: number;
    x_inc: number;
    y_inc: number;
    x_min: number;
    x_max: number;
    y_min: number;
    y_max: number;
    val_min: number;
    val_max: number;
    rot_deg: number;
    values_b64arr: B64FloatArray;
};

