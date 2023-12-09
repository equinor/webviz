/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { B64FloatArray } from './B64FloatArray';

/**
 * Definition of a fence of seismic data from a set of (x, y) coordinates in domain coordinate system.
 * Each (x, y) point provides a trace perpendicular to the x-y plane, with number of samples equal to the depth of the seismic cube.
 *
 * Each trace is defined to be a set of depth value samples along the length direction of the fence.
 *
 * `Properties:`
 * - `fence_traces_b64arr`: The fence trace array is base64 encoded 1D float array - where data is stored trace by trace.
 * - `num_traces`: The number of traces in the fence trace array. Equals the number of (x, y) coordinates in requested polyline.
 * - `num_samples_per_trace`: The number of samples in each trace.
 * - `min_fence_depth`: The minimum depth value of the fence.
 * - `max_fence_depth`: The maximum depth value of the fence.
 *
 * `Description - fence_traces_b64arr:`
 *
 * The encoded fence trace array is a flattened array of traces, where data is stored trace by trace.
 * With `m = num_traces`, and `n = num_samples_per_trace`, the flattened array has length `mxn`.
 *
 * Fence traces 1D array: [trace_1_sample_1, trace_1_sample_2, ..., trace_1_sample_n, ..., trace_m_sample_1, trace_m_sample_2, ..., trace_m_sample_n]
 *
 *
 * See:
 * - VdsAxis: https://github.com/equinor/vds-slice/blob/ab6f39789bf3d3b59a8df14f1c4682d340dc0bf3/internal/core/core.go#L37-L55
 */
export type SeismicFenceData = {
    fence_traces_b64arr: B64FloatArray;
    num_traces: number;
    num_samples_per_trace: number;
    min_fence_depth: number;
    max_fence_depth: number;
};

