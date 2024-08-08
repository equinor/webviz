import { VfpProdTable_api, UnitType_api, FlowRateType_api, TabType_api } from "@api";
import { VFPPROD_UNITS, UNITSET, VfpParam } from "../types";
import { WFR } from "src/api/models/WFR";
import { GFR } from "src/api/models/GFR";
import { ALQ } from "src/api/models/ALQ";

export class VfpDataAccessor {
    private _vfpTable: VfpProdTable_api;
    private _unitType: UnitType_api;
    private _unitSet: UNITSET;

    constructor(vfpTable: VfpProdTable_api) {
        this._vfpTable = vfpTable
        this._unitType = vfpTable.unit_type
        this._unitSet = VFPPROD_UNITS[this._unitType]
    }

    getTableNumber(): number {
        return this._vfpTable.table_number
    }

    getFlowRateUnit(): string {
        const flowRateUnits = this._unitSet.FLOWRATE_UNITS
        const flowRateType = this._vfpTable.flow_rate_type
        if (flowRateType == FlowRateType_api.OIL) {
            return flowRateUnits.OIL
        } else if (flowRateType == FlowRateType_api.GAS) {
            return flowRateUnits.GAS
        } else if (flowRateType == FlowRateType_api.LIQ) {
            return flowRateUnits.LIQ
        } else if (flowRateType == FlowRateType_api.TM) {
            return flowRateUnits.TM
        } else if (flowRateType == FlowRateType_api.WG) {
            return flowRateUnits.WG
        } else {
            return "Unknown"
        }
    }

    getBhpUnit(): string {   
        const tabType = this._vfpTable.tab_type
        if (tabType == TabType_api.TEMP) {
            return "Units for tab type TEMP not implemented"
        }
        // BHP unit must be the same as THP unit.
        return this._unitSet.THP_UNITS.THP
    }

    getFlowRateValues(): number[] {
        return this._vfpTable.flow_rate_values
    }

    getParamValues(param: VfpParam): number [] {
        if (param == VfpParam.THP) {
            return this._vfpTable.thp_values
        } else if (param == VfpParam.WFR) {
            return this._vfpTable.wfr_values
        } else if (param == VfpParam.GFR) {
            return this._vfpTable.gfr_values
        } else if (param == VfpParam.ALQ) {
            return this._vfpTable.alq_values
        }
        return []
    }

    getWfrType(): WFR {
        return this._vfpTable.wfr_type
    }

    getGfrType(): GFR {
        return this._vfpTable.gfr_type
    }

    getAlqType(): ALQ {
        return this._vfpTable.alq_type
    }

    getBhpValues(thpIndex: number, wfrIndex: number, gfrIndex: number, alqIndex: number) : number[] {
        const nbWfrValues = this._vfpTable.wfr_values.length
        const nbGfrValues = this._vfpTable.gfr_values.length
        const nbAlqValues = this._vfpTable.alq_values.length
        const nbFlowRates = this._vfpTable.flow_rate_values.length
        const startIndex = nbFlowRates*(nbAlqValues*(nbGfrValues*(nbWfrValues*thpIndex+wfrIndex)+gfrIndex)+alqIndex)
        return this._vfpTable.bhp_values.slice(startIndex, startIndex+nbFlowRates)
    }
}
