/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ObservationSurfaceAddress } from './ObservationSurfaceAddress';
import type { RealizationSurfaceAddress } from './RealizationSurfaceAddress';
import type { StatisticalSurfaceAddress } from './StatisticalSurfaceAddress';
import type { SurfaceGridDefinition } from './SurfaceGridDefinition';
export type Body_post_get_resampled_surface_data = {
    surface_address: (RealizationSurfaceAddress | StatisticalSurfaceAddress | ObservationSurfaceAddress);
    grid_definition: SurfaceGridDefinition;
};

