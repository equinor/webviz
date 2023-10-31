/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { B64FloatArray } from './B64FloatArray';

/**
 * Definition of a fence of seismic data from a set of (x, y) coordinates in domain coordinate system.
 * Each (x, y) point provides a trace perpendicular to the x-y plane, with number of samples equal to the depth of the seismic cube.
 *
 * The trace is along the along length direction of the fence.
 *
 * `Properties:`
 * - `fence_traces_b64arr`: The fence trace array is base64 encoded 1D float array - where data is stored trace by trace.
 * - `num_traces`: The number of traces in the fence trace array. Equals the number of (x, y) coordinates in requested polyline.
 * - `num_trace_samples`: The number of samples in each trace.
 * - `min_fence_depth`: The minimum depth value of the fence.
 * - `max_fence_depth`: The maximum depth value of the fence.
 *
 * `Description - fence_traces_b64arr:`
 *
 * The encoded fence trace array is a flattened array of traces, where data is stored trace by trace.
 * With `m = num_traces`, and `n = num_trace_samples`, the flattened array has length `mxn`.
 *
 * Fence traces 1D array: [trace_1, trace_2, ..., trace_m]
 *
 * trace_1, trace_2, ... , trace_m are 1D arrays: [sample_1, sample_2, ..., sample_n]
 *
 * See:
 * - VdsAxis: https://github.com/equinor/vds-slice/blob/ab6f39789bf3d3b59a8df14f1c4682d340dc0bf3/internal/core/core.go#L37-L55
 */
export type SeismicFenceData = {
    fence_traces_b64arr: B64FloatArray;
    num_traces: number;
    num_trace_samples: number;
    min_fence_depth: number;
    max_fence_depth: number;
};

