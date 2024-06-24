/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SurfaceAttributeType } from './SurfaceAttributeType';
import type { SurfaceTimeType } from './SurfaceTimeType';
export type SurfaceMeta = {
    name: string;
    name_is_stratigraphic_offical: boolean;
    attribute_name: string;
    attribute_type: SurfaceAttributeType;
    time_type: SurfaceTimeType;
    is_observation: boolean;
    value_min: (number | null);
    value_max: (number | null);
};

