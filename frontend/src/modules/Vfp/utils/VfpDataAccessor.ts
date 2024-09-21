import { VfpProdTable_api, VfpInjTable_api, FlowRateType_api, ALQ_api, WFR_api, GFR_api } from "@api";
import { VfpParam } from "../types";
import { VfpType_api } from "@api";

export class VfpDataAccessor {
    private _vfpTable: VfpProdTable_api | VfpInjTable_api;


    constructor(vfpTable: VfpProdTable_api | VfpInjTable_api) {
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
        if (flowRateType == FlowRateType_api.OIL) {
            return `Oil Rate (${flowRateUnit})`
        } else if (flowRateType == FlowRateType_api.GAS) {
            return `Gas Rate (${flowRateUnit})`
        } else if (flowRateType == FlowRateType_api.LIQ) {
            return `Liquid Rate (${flowRateUnit})`
        } else if (flowRateType == FlowRateType_api.TM) {
            return `TM (${flowRateUnit})`
        } else if (flowRateType == FlowRateType_api.WG) {
            return `WG (${flowRateUnit})`
        } else if (flowRateType == FlowRateType_api.WAT) {
            return `Water Rate (${flowRateUnit})`
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
        }
        if (this._vfpTable.vfp_type === VfpType_api.VFPPROD) {
            const vfpProdTable = <VfpProdTable_api>this._vfpTable
            if (vfpParam == VfpParam.WFR) {
                return vfpProdTable.wfr_values
            } else if (vfpParam == VfpParam.GFR) {
                return vfpProdTable.gfr_values
            } else if (vfpParam == VfpParam.ALQ) {
                return vfpProdTable.alq_values
            }
        }
        // throw Error?
        return []
    }

    getVfpParamUnit(vfpParam: VfpParam): string {
        if (vfpParam == VfpParam.THP) {
            return this._vfpTable.thp_unit
        } 
        if (this._vfpTable.vfp_type === VfpType_api.VFPPROD) {
            const vfpProdTable = <VfpProdTable_api>this._vfpTable        
            if (vfpParam == VfpParam.WFR) {
                return vfpProdTable.wfr_unit
            } else if (vfpParam == VfpParam.GFR) {
                return vfpProdTable.gfr_unit
            } else if (vfpParam == VfpParam.ALQ) {
                return vfpProdTable.alq_unit
            }
        }
        // throw Error?
        return ""
    }

    getVfpParamLabel(vfpParam: VfpParam, includeUnit: boolean): string {
        let label = ""
        if (vfpParam == VfpParam.THP) {
            label = "THP"
        } 
        if (this._vfpTable.vfp_type === VfpType_api.VFPPROD) {
            const vfpProdTable = <VfpProdTable_api>this._vfpTable
            if (vfpParam == VfpParam.WFR) {
                label = vfpProdTable.wfr_type
            } else if (vfpParam == VfpParam.GFR) {
                label = vfpProdTable.gfr_type
            } else if (vfpParam == VfpParam.ALQ) {
                if (vfpProdTable.alq_type === ALQ_api._) {
                    label = "ALQ"
                } else {
                    label = "ALQ: " + vfpProdTable.alq_type
                }
            }            
        }
        const unit = this.getVfpParamUnit(vfpParam)
        if (includeUnit && unit != "") {
            label += ` (${unit})`
        }
        return label
    }

    getWfrType(): WFR_api {
        if (this._vfpTable.vfp_type === VfpType_api.VFPPROD) {
            const vfpProdTable = <VfpProdTable_api>this._vfpTable
            return vfpProdTable.wfr_type
        }
        throw Error("WFR type is not valid for VFPINJ tables.")
    }

    getGfrType(): GFR_api {
        if (this._vfpTable.vfp_type === VfpType_api.VFPPROD) {
            let vfpProdTable = <VfpProdTable_api>this._vfpTable
            return vfpProdTable.gfr_type
        }
        throw Error("GFR type is not valid for VFPINJ tables.")
    }

    getAlqType(): ALQ_api {
        if (this._vfpTable.vfp_type === VfpType_api.VFPPROD) {
            let vfpProdTable = <VfpProdTable_api>this._vfpTable
            return vfpProdTable.alq_type
        }
        throw Error("ALQ type is not valid for VFPINJ tables.")
    }

    getVfpProdBhpValues(thpIndex: number, wfrIndex: number, gfrIndex: number, alqIndex: number) : number[] {
        if (this._vfpTable.vfp_type === VfpType_api.VFPPROD) {
            const vfpProdTable = <VfpProdTable_api>this._vfpTable
            const nbWfrValues = vfpProdTable.wfr_values.length
            const nbGfrValues = vfpProdTable.gfr_values.length
            const nbAlqValues = vfpProdTable.alq_values.length
            const nbFlowRates = this._vfpTable.flow_rate_values.length
            const startIndex = nbFlowRates*(nbAlqValues*(nbGfrValues*(nbWfrValues*thpIndex+wfrIndex)+gfrIndex)+alqIndex)
            return this._vfpTable.bhp_values.slice(startIndex, startIndex+nbFlowRates)
        }
        throw Error("The getVfpProdBhpValues function is not valid for VFPINJ tables.")
    }

    getVfpInjBhpValues(thpIndex: number) : number[] {
        if (this._vfpTable.vfp_type === VfpType_api.VFPINJ) {
            const nbFlowRates = this._vfpTable.flow_rate_values.length
            const startIndex = nbFlowRates*thpIndex
            return this._vfpTable.bhp_values.slice(startIndex, startIndex+nbFlowRates)
        }
        throw Error("The getVfpInjBhpValues function is not valid for VFPPROD tables.")    
    }

    getNumberOfValues(vfpParam: VfpParam): number {
        if (vfpParam == VfpParam.THP) {
            return this._vfpTable.thp_values.length
        } 
        if (this._vfpTable.vfp_type === VfpType_api.VFPPROD) {
            const vfpProdTable = <VfpProdTable_api>this._vfpTable
            if (vfpParam == VfpParam.WFR) {
                return vfpProdTable.wfr_values.length
            } else if (vfpParam == VfpParam.GFR) {
                return vfpProdTable.gfr_values.length
            } else if (vfpParam == VfpParam.ALQ) {
                return vfpProdTable.alq_values.length
            }            
        }
        return NaN
    }
}
