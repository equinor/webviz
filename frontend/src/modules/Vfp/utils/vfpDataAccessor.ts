import { Alq_api, FlowRateType_api, Gfr_api, VfpInjTable_api, VfpProdTable_api, Wfr_api } from "@api";

import { isProdTable } from "./vfpTableClassifier";

import { VfpParam, VfpType } from "../types";

export class VfpDataAccessor {
    private _vfpTable: VfpProdTable_api | VfpInjTable_api;

    constructor(vfpTable: VfpProdTable_api | VfpInjTable_api) {
        this._vfpTable = vfpTable;
    }

    isProdTable(): boolean {
        return isProdTable(this._vfpTable);
    }

    isInjTable(): boolean {
        return !isProdTable(this._vfpTable);
    }

    getTableNumber(): number {
        return this._vfpTable.tableNumber;
    }

    getVfpType(): VfpType {
        if (this.isProdTable()) {
            return VfpType.VFPPROD;
        }
        return VfpType.VFPINJ;
    }

    getFlowRateLabel(): string {
        const flowRateType = this._vfpTable.flowRateType;
        const flowRateUnit = this.getFlowRateUnit();
        if (flowRateType === FlowRateType_api.OIL) {
            return `Oil Rate (${flowRateUnit})`;
        } else if (flowRateType === FlowRateType_api.GAS) {
            return `Gas Rate (${flowRateUnit})`;
        } else if (flowRateType === FlowRateType_api.LIQ) {
            return `Liquid Rate (${flowRateUnit})`;
        } else if (flowRateType === FlowRateType_api.TM) {
            return `TM (${flowRateUnit})`;
        } else if (flowRateType === FlowRateType_api.WG) {
            return `WG (${flowRateUnit})`;
        } else if (flowRateType === FlowRateType_api.WAT) {
            return `Water Rate (${flowRateUnit})`;
        }
        throw Error("Unhandled flow rate type.");
    }

    getFlowRateUnit(): string {
        return this._vfpTable.flowRateUnit;
    }

    getBhpUnit(): string {
        return this._vfpTable.bhpUnit;
    }

    getFlowRateValues(): number[] {
        return this._vfpTable.flowRateValues;
    }

    getVfpParamValues(vfpParam: VfpParam): number[] {
        if (vfpParam === VfpParam.THP) {
            return this._vfpTable.thpValues;
        }
        if ("isProdTable" in this._vfpTable) {
            if (vfpParam === VfpParam.WFR) {
                return this._vfpTable.wfrValues;
            }
            if (vfpParam === VfpParam.GFR) {
                return this._vfpTable.gfrValues;
            }
            if (vfpParam === VfpParam.ALQ) {
                return this._vfpTable.alqValues;
            }
        }
        throw Error(`Unhandled vfp parameter ${vfpParam}`);
    }

    getVfpParamUnit(vfpParam: VfpParam): string {
        if (vfpParam === VfpParam.THP) {
            return this._vfpTable.thpUnit;
        }
        if (isProdTable(this._vfpTable)) {
            // This means that it is a VFPPROD table
            if (vfpParam === VfpParam.WFR) {
                return this._vfpTable.wfrUnit;
            } else if (vfpParam === VfpParam.GFR) {
                return this._vfpTable.gfrUnit;
            } else if (vfpParam === VfpParam.ALQ) {
                return this._vfpTable.alqUnit;
            }
        }
        throw Error(`Unhandled vfp parameter ${vfpParam}`);
    }

    getVfpParamLabel(vfpParam: VfpParam, includeUnit: boolean): string {
        let label = "";
        if (vfpParam === VfpParam.THP) {
            label = "THP";
        }
        if (isProdTable(this._vfpTable)) {
            // This means that it is a VFPPROD table
            if (vfpParam === VfpParam.WFR) {
                label = this._vfpTable.wfrType;
            } else if (vfpParam === VfpParam.GFR) {
                label = this._vfpTable.gfrType;
            } else if (vfpParam === VfpParam.ALQ) {
                if (this._vfpTable.alqType === Alq_api["''"]) {
                    label = "ALQ";
                } else {
                    label = "ALQ: " + this._vfpTable.alqType;
                }
            }
        }
        const unit = this.getVfpParamUnit(vfpParam);
        if (includeUnit && unit != "") {
            label += ` (${unit})`;
        }
        return label;
    }

    getWfrType(): Wfr_api {
        if (isProdTable(this._vfpTable)) {
            // This means that it is a VFPPROD table
            return this._vfpTable.wfrType;
        }
        throw Error("WFR type is not valid for VFPINJ tables.");
    }

    getGfrType(): Gfr_api {
        if (isProdTable(this._vfpTable)) {
            // This means that it is a VFPPROD table
            return this._vfpTable.gfrType;
        }
        throw Error("GFR type is not valid for VFPINJ tables.");
    }

    getAlqType(): Alq_api {
        if (isProdTable(this._vfpTable)) {
            // This means that it is a VFPPROD table
            return this._vfpTable.alqType;
        }
        throw Error("ALQ type is not valid for VFPINJ tables.");
    }

    getVfpProdBhpValues(thpIndex: number, wfrIndex: number, gfrIndex: number, alqIndex: number): number[] {
        if (!isProdTable(this._vfpTable)) {
            throw Error("The getVfpProdBhpValues function is only valid for Production VFP tables.");
        }
        const nbWfrValues = this._vfpTable.wfrValues.length;
        const nbGfrValues = this._vfpTable.gfrValues.length;
        const nbAlqValues = this._vfpTable.alqValues.length;
        const nbFlowRates = this._vfpTable.flowRateValues.length;
        const startIndex =
            nbFlowRates * (nbAlqValues * (nbGfrValues * (nbWfrValues * thpIndex + wfrIndex) + gfrIndex) + alqIndex);
        return this._vfpTable.bhpValues.slice(startIndex, startIndex + nbFlowRates);
    }

    getVfpInjBhpValues(thpIndex: number): number[] {
        if (isProdTable(this._vfpTable)) {
            throw Error("The getVfpInjBhpValues function is only valid for Injection VFP tables.");
        }
        const nbFlowRates = this._vfpTable.flowRateValues.length;
        const startIndex = nbFlowRates * thpIndex;
        return this._vfpTable.bhpValues.slice(startIndex, startIndex + nbFlowRates);
    }

    getNumberOfValues(vfpParam: VfpParam): number {
        if (vfpParam === VfpParam.THP) {
            return this._vfpTable.thpValues.length;
        }
        if (isProdTable(this._vfpTable)) {
            // This means that it is a VFPPROD table
            if (vfpParam === VfpParam.WFR) {
                return this._vfpTable.wfrValues.length;
            } else if (vfpParam === VfpParam.GFR) {
                return this._vfpTable.gfrValues.length;
            } else if (vfpParam === VfpParam.ALQ) {
                return this._vfpTable.alqValues.length;
            }
        }
        throw Error(`Unhandled vfp parameter ${vfpParam}`);
    }
}
