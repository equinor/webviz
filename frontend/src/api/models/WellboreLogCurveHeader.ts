/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { WellLogCurveSourceEnum } from './WellLogCurveSourceEnum';
import type { WellLogCurveTypeEnum } from './WellLogCurveTypeEnum';
export type WellboreLogCurveHeader = {
    source: WellLogCurveSourceEnum;
    sourceId: string;
    curveType: WellLogCurveTypeEnum;
    logName: string;
    curveName: string;
    curveUnit: (string | null);
};

