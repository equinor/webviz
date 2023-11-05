/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { StratigraphicFeature } from './StratigraphicFeature';
import type { SurfaceAttributeType } from './SurfaceAttributeType';
export type SurfaceMeta = {
    name: string;
    name_is_stratigraphic_offical: boolean;
    stratigraphic_identifier?: (string | null);
    relative_stratigraphic_level?: (number | null);
    parent_stratigraphic_identifier?: (string | null);
    stratigraphic_feature?: (StratigraphicFeature | null);
    attribute_name: string;
    attribute_type: SurfaceAttributeType;
    iso_date_or_interval?: (string | null);
    is_observation: boolean;
    value_min?: (number | null);
    value_max?: (number | null);
};

