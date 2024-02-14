/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SurfaceAddressType } from './SurfaceAddressType';
export type RealizationSurfaceAddress = {
    address_type: SurfaceAddressType;
    case_uuid: string;
    ensemble_name: string;
    name: string;
    attribute: string;
    realization_num: number;
    iso_date_or_interval?: (string | null);
};

