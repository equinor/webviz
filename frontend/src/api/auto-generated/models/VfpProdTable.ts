/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ALQ } from './ALQ';
import type { FlowRateType } from './FlowRateType';
import type { GFR } from './GFR';
import type { TabType } from './TabType';
import type { THP } from './THP';
import type { UnitType } from './UnitType';
import type { WFR } from './WFR';
export type VfpProdTable = {
    isProdTable: boolean;
    tableNumber: number;
    datum: number;
    thpType: THP;
    wfrType: WFR;
    gfrType: GFR;
    alqType: ALQ;
    flowRateType: FlowRateType;
    unitType: UnitType;
    tabType: TabType;
    thpValues: Array<number>;
    wfrValues: Array<number>;
    gfrValues: Array<number>;
    alqValues: Array<number>;
    flowRateValues: Array<number>;
    bhpValues: Array<number>;
    flowRateUnit: string;
    thpUnit: string;
    wfrUnit: string;
    gfrUnit: string;
    alqUnit: string;
    bhpUnit: string;
};

