/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CurveData } from './CurveData';
import type { RelPermRealizationDataForSaturation } from './RelPermRealizationDataForSaturation';
export type SaturationRealizationData = {
    saturation_axis_data: CurveData;
    satnum_data: Array<RelPermRealizationDataForSaturation>;
    realization_id: number;
};

