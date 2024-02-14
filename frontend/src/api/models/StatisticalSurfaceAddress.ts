/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SurfaceAddressType } from './SurfaceAddressType';
import type { SurfaceStatisticFunction } from './SurfaceStatisticFunction';
export type StatisticalSurfaceAddress = {
    address_type: SurfaceAddressType;
    case_uuid: string;
    ensemble_name: string;
    name: string;
    attribute: string;
    iso_date_or_interval?: (string | null);
    statistic_function: SurfaceStatisticFunction;
};

