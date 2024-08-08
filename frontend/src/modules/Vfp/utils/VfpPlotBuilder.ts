import { Size2D, sizeDifference } from "@lib/utils/geometry";
import { ColorSet } from "@lib/utils/ColorSet";
import { Figure, makeSubplots } from "@modules/_shared/Figure";
import React from "react";
import { Layout, PlotData } from "plotly.js";
import { VfpParam } from "../types";
import { VfpDataAccessor } from "./VfpDataAccessor";

export class VfpPlotBuilder {
    private _vfpDataAccessor: VfpDataAccessor;

    constructor(vfpDataAccessor: VfpDataAccessor){
        this._vfpDataAccessor = vfpDataAccessor
    }

    makeLayout(size: Size2D) : Partial<Layout> {
        return {
            title: "VFP Table number: " + this._vfpDataAccessor.getTableNumber(),
            xaxis: { title: this._vfpDataAccessor.getFlowRateUnit()},
            yaxis: { title: this._vfpDataAccessor.getBhpUnit()},
            width: size.width,
            height: size.height,
        };
    }

    makeTraces(
        selectedThpIndices: number[] | null,
        selectedWfrIndices: number[] | null,
        selectedGfrIndices: number[] | null, 
        selectedAlqIndices: number[] | null,
        colorBy: VfpParam,
        colorSet: ColorSet
    ) : Partial<PlotData>[] {

        const data: Partial<PlotData>[] = [];
        const colors = this.makeColorsArray(colorSet)
        let color = colors[0]

        if (selectedThpIndices == null || selectedWfrIndices == null || selectedGfrIndices == null || selectedAlqIndices == null) {
            return [];
        }

        for (let i = 0; i < selectedThpIndices.length; i++) {
            for (let j = 0; j < selectedWfrIndices.length; j++) {
                for (let k = 0; k < selectedGfrIndices.length; k++) {
                    for (let l = 0; l < selectedAlqIndices.length; l++) {
                        const thpIndex = selectedThpIndices[i]
                        const wfrIndex = selectedWfrIndices[j]
                        const gfrIndex = selectedGfrIndices[k]
                        const alqIndex = selectedAlqIndices[l]
                        const trace = this.getSingleVfpTrace(thpIndex, wfrIndex, gfrIndex, alqIndex, color)
                        data.push(trace)
                    }
                }
            }
        }
        return data
    }

    private getSingleVfpTrace(thpIndex: number, wfrIndex: number, gfrIndex: number, alqIndex: number, color: string) : Partial<PlotData> { 
        const thpValue = this._vfpDataAccessor.getParamValues(VfpParam.THP)[thpIndex]
        const wfrValue = this._vfpDataAccessor.getParamValues(VfpParam.WFR)[wfrIndex]
        const gfrValue = this._vfpDataAccessor.getParamValues(VfpParam.GFR)[gfrIndex]
        const alqValue = this._vfpDataAccessor.getParamValues(VfpParam.ALQ)[alqIndex]

        const name = `THP=${thpValue} ${this._vfpDataAccessor.getWfrType()}=${wfrValue} ${this._vfpDataAccessor.getGfrType()}=${gfrValue} ALQ=${alqValue}`

        const trace: Partial<PlotData> = {
            x: this._vfpDataAccessor.getFlowRateValues(),
            y: this._vfpDataAccessor.getBhpValues(thpIndex, wfrIndex, gfrIndex, alqIndex),
            mode: "lines",
            name: name,
            line: {
                color,
            },
            showlegend: false,
            hovertemplate: name,
        };

        return trace
    }

    private makeColorsArray(
        colorSet: ColorSet,
    ): readonly string[] {
        const colors: string[] = [];
        colors.push(colorSet.getFirstColor());

        return colors;
    }

}