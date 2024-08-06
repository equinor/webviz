import { FlowRateType_api, VfpProdTable_api, TabType_api } from "@api";
import { Size2D } from "@lib/utils/geometry";
import { ColorSet } from "@lib/utils/ColorSet";
import { Figure, makeSubplots } from "@modules/_shared/Figure";
import React from "react";
import { Layout, PlotData } from "plotly.js";
import { ColorBy } from "../types";
import { selectClasses } from "@mui/base";
import { VFPPROD_UNITS } from "../types";

export class VfpPlotBuilder {
    private _figure: Figure | null = null;
    private _vfpTable: VfpProdTable_api | null = null;

    constructor(vfpTable: VfpProdTable_api){
        this._vfpTable = vfpTable
    }

    makeLayout(size: Size2D) : void {

        if (this._vfpTable == null) {
            this._figure = makeSubplots({
                width: size.width,
                height: size.height,
                sharedXAxes: false,
                sharedYAxes: false,
                showGrid: true,
                //margin: { t: 30, b: 40, l: 60, r: 10 },
                subplotTitles: ["No VFP table found"],
            });
        } else {

            const subplotTitles: string[] = ["VFP Table number: " + this._vfpTable.table_number];
            this._figure = makeSubplots({
                width: size.width,
                height: size.height,
                sharedXAxes: false,
                sharedYAxes: false,
                showGrid: true,
                margin: { t: 30, b: 40, l: 100, r: 10 },
                subplotTitles: subplotTitles,
            });

            let patch: Partial<Layout> = {
                title: "",
                xaxis: { title: this.getFlowRateUnit() },
                yaxis: { title: this.getBhpUnit() },
            };

            this._figure.updateLayout(patch)
        }

    }

    makeTraces(
        selectedThpIndices: number[] | null,
        selectedWfrIndices: number[] | null,
        selectedGfrIndices: number[] | null, 
        selectedAlqIndices: number[] | null,
        colorBy: ColorBy,
        colorSet: ColorSet
    ) : void {
        const figure = this.getFigureAndAssertValidity()
        const colors = this.makeColorsArray(colorSet)
        let color = colors[0]

        if (this._vfpTable == null || selectedThpIndices == null || selectedWfrIndices == null || selectedGfrIndices == null || selectedAlqIndices == null) {
            return;
        }

        for (let i = 0; i < selectedThpIndices.length; i++) {
            for (let j = 0; j < selectedWfrIndices.length; j++) {
                for (let k = 0; k < selectedGfrIndices.length; k++) {
                    for (let l = 0; l < selectedAlqIndices.length; l++) {
                        const thpIndex = selectedThpIndices[i]
                        const wfrIndex = selectedWfrIndices[j]
                        const gfrIndex = selectedGfrIndices[k]
                        const alqIndex = selectedAlqIndices[l]
                        const borderTrace = this.getSingleVfpTrace(thpIndex, wfrIndex, gfrIndex, alqIndex, color)
                        figure.addTrace(borderTrace);
                    }
                }
            }
        }
    }

    private getFlowRateUnit() : string {
        if (this._vfpTable == null) {
            return ""
        }
        const unitType = this._vfpTable.unit_type
        const flowRateUnits = VFPPROD_UNITS[unitType].FLOWRATE_UNITS
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

    private getBhpUnit() : string {
        if (this._vfpTable == null) {
            return ""
        }        
        const unitType = this._vfpTable.unit_type
        const tabType = this._vfpTable.tab_type
        if (tabType == TabType_api.TEMP) {
            return "Units for tab type TEMP not implemented"
        }
        // BHP unit must be the same as THP unit.
        return VFPPROD_UNITS[unitType].THP_UNITS.THP

    }

    private getSingleVfpTrace(thpIndex: number, wfrIndex: number, gfrIndex: number, alqIndex: number, color: string) : Partial<PlotData> {
        if (this._vfpTable == null) {
            return {}
        }
        
        const thpValue = this._vfpTable.thp_values[thpIndex]
        const wfrValue = this._vfpTable.wfr_values[wfrIndex]
        const gfrValue = this._vfpTable.gfr_values[gfrIndex]
        const alqValue = this._vfpTable.alq_values[alqIndex]

        const name = `THP=${thpValue} ${this._vfpTable.wfr_type}=${wfrValue} ${this._vfpTable.gfr_type}=${gfrValue} ALQ=${alqValue}`

        const borderTrace: Partial<PlotData> = {
            x: this._vfpTable?.flow_rate_values,
            y: this.getBhpValues(thpIndex, wfrIndex, gfrIndex, alqIndex),
            mode: "lines",
            name: name,
            line: {
                color,
            },
            showlegend: false,
            hovertemplate: name,
        };

        return borderTrace

    }

    private getBhpValues(thpIndex: number, wfrIndex: number, gfrIndex: number, alqIndex: number) : number[] {
        if (this._vfpTable == null) {
            return [];
        }
        const nbWfrValues = this._vfpTable.wfr_values.length
        const nbGfrValues = this._vfpTable.gfr_values.length
        const nbAlqValues = this._vfpTable.alq_values.length
        const nbFlowRates = this._vfpTable.flow_rate_values.length
        const startIndex = nbFlowRates*(nbAlqValues*(nbGfrValues*(nbWfrValues*thpIndex+wfrIndex)+gfrIndex)+alqIndex)
        return this._vfpTable.bhp_values.slice(startIndex, startIndex+nbFlowRates)
    }

    private makeColorsArray(
        colorSet: ColorSet,
    ): readonly string[] {
        const colors: string[] = [];
        colors.push(colorSet.getFirstColor());

        return colors;
    }

    makePlot(): React.ReactNode {
        const figure = this.getFigureAndAssertValidity();
        return figure.makePlot();
    }

    private getFigureAndAssertValidity(): Figure {
        if (!this._figure) {
            throw new Error("You have to call the `makeLayout` method first.");
        }

        return this._figure;
    }
}