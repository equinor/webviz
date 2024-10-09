import { VfpProdTable_api, FlowRateTypeProd_api, ALQ_api, WFR_api, GFR_api } from "@api";
import { VfpParam } from "../types";

export class VfpDataAccessor {
    private _vfpTable: VfpProdTable_api;


    constructor(vfpTable: VfpProdTable_api) {
        this._vfpTable = vfpTable
    }

    getTableNumber(): number {
        return this._vfpTable.table_number
    }

    getTableType(): string {
        return this._vfpTable.vfp_type
    }

    getFlowRateLabel(): string {
        const flowRateType = this._vfpTable.flow_rate_type
        const flowRateUnit = this.getFlowRateUnit()
        if (flowRateType == FlowRateTypeProd_api.OIL) {
            return `Oil Rate (${flowRateUnit})`
        } else if (flowRateType == FlowRateTypeProd_api.GAS) {
            return `Gas Rate (${flowRateUnit})`
        } else if (flowRateType == FlowRateTypeProd_api.LIQ) {
            return `Liquid Rate (${flowRateUnit})`
        } else if (flowRateType == FlowRateTypeProd_api.TM) {
            return `TM (${flowRateUnit})`
        } else if (flowRateType == FlowRateTypeProd_api.WG) {
            return `WG (${flowRateUnit})`
        }
        return "Flow rate type unknown"      
    }

    getFlowRateUnit(): string {
        return this._vfpTable.flow_rate_unit   
    }

    getBhpUnit(): string {   
        return this._vfpTable.bhp_unit
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
            return this._vfpTable.thp_unit
        } else if (vfpParam == VfpParam.WFR) {
            return this._vfpTable.wfr_unit
        } else if (vfpParam == VfpParam.GFR) {
            return this._vfpTable.gfr_unit
        } else if (vfpParam == VfpParam.ALQ) {
            return this._vfpTable.alq_unit
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
