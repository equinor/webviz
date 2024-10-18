/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FlowRateType } from './FlowRateType';
import type { TabType } from './TabType';
import type { UnitType } from './UnitType';
export type VfpInjTable = {
    isInjTable: boolean;
    tableNumber: number;
    datum: number;
    flowRateType: FlowRateType;
    unitType: UnitType;
    tabType: TabType;
    thpValues: Array<number>;
    flowRateValues: Array<number>;
    bhpValues: Array<number>;
    flowRateUnit: string;
    thpUnit: string;
    bhpUnit: string;
};

