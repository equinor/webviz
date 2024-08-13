import { VfpProdTable_api, UnitType_api, FlowRateType_api, TabType_api, ALQ_api, WFR_api, GFR_api } from "@api";
import { VFPPROD_UNITS, UNITSET, VfpParam } from "../types";

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

    getVfpParamValues(vfpParam: VfpParam): number [] {
        if (vfpParam == VfpParam.THP) {
            return this._vfpTable.thp_values
        } else if (vfpParam == VfpParam.WFR) {
            return this._vfpTable.wfr_values
        } else if (vfpParam == VfpParam.GFR) {
            return this._vfpTable.gfr_values
        } else if (vfpParam == VfpParam.ALQ) {
            return this._vfpTable.alq_values
        }
        return []
    }

    getVfpParamUnit(vfpParam: VfpParam): string {
        if (vfpParam == VfpParam.THP) {
            return this._unitSet.THP_UNITS.THP
        } else if (vfpParam == VfpParam.WFR) {
            const wfrUnits = this._unitSet.WFR_UNITS
            const wfrType = this.getWfrType()
            if (wfrType == WFR_api.WCT) {
                return wfrUnits.WCT
            } else if (wfrType == WFR_api.WGR) {
                return wfrUnits.WGR
            } else if (wfrType == WFR_api.WOR) {
                return wfrUnits.WOR
            } else if (wfrType == WFR_api.WTF) {
                return wfrUnits.WTF
            } else if (wfrType == WFR_api.WWR) {
                return wfrUnits.WWR
            }
        } else if (vfpParam == VfpParam.GFR) {
            const gfrUnits = this._unitSet.GFR_UNITS
            const gfrType = this.getGfrType()
            if (gfrType == GFR_api.GLR) {
                return gfrUnits.GLR
            } else if (gfrType == GFR_api.GOR) {
                return gfrUnits.GOR
            } else if (gfrType == GFR_api.MMW) {
                return gfrUnits.MMW
            } else if (gfrType == GFR_api.OGR) {
                return gfrUnits.OGR
            }
        } else if (vfpParam == VfpParam.ALQ) {
            const alqUnits = this._unitSet.ALQ_UNITS
            const alqType = this.getAlqType()
            if (alqType == ALQ_api.GRAT) {
                return alqUnits.GRAT
            } else if (alqType == ALQ_api.IGLR) {
                return alqUnits.IGLR
            } else if (alqType == ALQ_api.TGLR) {
                return alqUnits.TGLR
            } else if (alqType == ALQ_api.DENO) {
                return alqUnits.DENO
            } else if (alqType == ALQ_api.DENG) {
                return alqUnits.DENG
            } else if (alqType == ALQ_api.BEAN) {
                return alqUnits.BEAN
            }
        }
        return ""
    }

    getVfpParamLabel(vfpParam: VfpParam, includeUnit: boolean): string {
        let label = ""
        if (vfpParam == VfpParam.THP) {
            label = "THP"
        } else if (vfpParam == VfpParam.WFR) {
            label = this._vfpTable.wfr_type
        } else if (vfpParam == VfpParam.GFR) {
            label = this._vfpTable.gfr_type
        } else if (vfpParam == VfpParam.ALQ) {
            if (this._vfpTable.alq_type === ALQ_api._) {
                label = "ALQ"
            } else {
                label = "ALQ: " + this._vfpTable.alq_type
            }
        }
        const unit = this.getVfpParamUnit(vfpParam)
        if (includeUnit && unit != "") {
            label += ` (${unit})`
        }
        return label
    }

    getWfrType(): WFR_api {
        return this._vfpTable.wfr_type
    }

    getGfrType(): GFR_api {
        return this._vfpTable.gfr_type
    }

    getAlqType(): ALQ_api {
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

    getNumberOfValues(vfpParam: VfpParam): number {
        if (vfpParam == VfpParam.THP) {
            return this._vfpTable.thp_values.length
        } else if (vfpParam == VfpParam.WFR) {
            return this._vfpTable.wfr_values.length
        } else if (vfpParam == VfpParam.GFR) {
            return this._vfpTable.gfr_values.length
        } else if (vfpParam == VfpParam.ALQ) {
            return this._vfpTable.alq_values.length
        }
        return NaN
    }
}
