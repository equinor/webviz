/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ALQ } from './ALQ';
import type { FlowRateType } from './FlowRateType';
import type { GFR } from './GFR';
import type { TabType } from './TabType';
import type { UnitType } from './UnitType';
import type { VfpType } from './VfpType';
import type { WFR } from './WFR';
export type VfpProdTable = {
    vfp_type: VfpType;
    table_number: number;
    datum: number;
    wfr_type: WFR;
    gfr_type: GFR;
    alq_type: ALQ;
    flow_rate_type: FlowRateType;
    unit_type: UnitType;
    tab_type: TabType;
    thp_values: Array<number>;
    wfr_values: Array<number>;
    gfr_values: Array<number>;
    alq_values: Array<number>;
    flow_rate_values: Array<number>;
    bhp_values: Array<number>;
};

