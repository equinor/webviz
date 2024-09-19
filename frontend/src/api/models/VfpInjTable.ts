/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FlowRateType } from './FlowRateType';
import type { TabType } from './TabType';
import type { UnitType } from './UnitType';
import type { VfpType } from './VfpType';
export type VfpInjTable = {
    vfp_type: VfpType;
    table_number: number;
    datum: number;
    flow_rate_type: FlowRateType;
    unit_type: UnitType;
    tab_type: TabType;
    thp_values: Array<number>;
    flow_rate_values: Array<number>;
    bhp_values: Array<number>;
    flow_rate_unit: string;
    thp_unit: string;
    bhp_unit: string;
};

