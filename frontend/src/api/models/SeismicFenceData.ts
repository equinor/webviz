/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { B64FloatArray } from './B64FloatArray';

/**
 * Definition of a fence of seismic data from a set of (x, y) coordinates in domain coordinate system.
 *
 * - fence_traces_encoded: The fence trace array is base64 encoded float array.
 * - num_traces: The number of traces along length/width direction of the fence, i.e. the number of (x, y) coordinates.
 * - num_trace_samples: The number of samples in each trace, i.e. the number of values along the height/depth axis of the fence.
 * - min_height: The minimum height/depth value of the fence.
 * - max_height: The maximum height/depth value of the fence.
 *
 * Each (x, y) point provides a trace perpendicular to the x-y plane, with number of samples equal to the depth of the seismic cube.
 *
 * trace1  trace2  trace3
 * |-------|-------|
 * |-------|-------|
 * |-------|-------|  Height/depth axis
 * |-------|-------|
 * |-------|-------|
 *
 * See:
 * - VdsAxis: https://github.com/equinor/vds-slice/blob/ab6f39789bf3d3b59a8df14f1c4682d340dc0bf3/internal/core/core.go#L37-L55
 */
export type SeismicFenceData = {
    fence_traces_encoded: B64FloatArray;
    num_traces: number;
    num_trace_samples: number;
    min_height: number;
    max_height: number;
};

