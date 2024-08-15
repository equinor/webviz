import { Size2D } from "@lib/utils/geometry";
import { Layout, PlotData, PlotMarker } from "plotly.js";
import { PressureOption, VfpParam } from "../types";
import { VfpDataAccessor } from "./VfpDataAccessor";
import { ColorScale } from "@lib/utils/ColorScale";

export class VfpPlotBuilder {
    private _vfpDataAccessor: VfpDataAccessor;
    private _colorScale: ColorScale;

    constructor(vfpDataAccessor: VfpDataAccessor, colorScale: ColorScale){
        this._vfpDataAccessor = vfpDataAccessor
        this._colorScale = colorScale
    }

    makeLayout(size: Size2D, pressureOption: PressureOption) : Partial<Layout> {
        return {
            title: `VFP type: ${this._vfpDataAccessor.getTableType()}, table number: ${this._vfpDataAccessor.getTableNumber()}`,
            xaxis: { title: this._vfpDataAccessor.getFlowRateLabel()},
            yaxis: { title: `${pressureOption} (${this._vfpDataAccessor.getBhpUnit()})`},
            width: size.width,
            height: size.height,
        };
    }

    makeTraces(
        selectedThpIndices: number[] | null,
        selectedWfrIndices: number[] | null,
        selectedGfrIndices: number[] | null, 
        selectedAlqIndices: number[] | null,
        pressureOption: PressureOption,
        colorBy: VfpParam,
    ) : Partial<PlotData>[] {

        const data: Partial<PlotData>[] = [];

        if (selectedThpIndices == null || selectedWfrIndices == null || selectedGfrIndices == null || selectedAlqIndices == null) {
            return [];
        }

        const colorByValues = this._vfpDataAccessor.getVfpParamValues(colorBy)
        const colorByIndices = {
            [VfpParam.THP]: selectedThpIndices,
            [VfpParam.WFR]: selectedWfrIndices,
            [VfpParam.GFR]: selectedGfrIndices,
            [VfpParam.ALQ]: selectedAlqIndices,
        }[colorBy]

        const selectedColorByValues = colorByIndices.map(index => colorByValues[index])
        const minValue = Math.min(...selectedColorByValues)
        const maxValue = Math.max(...selectedColorByValues)
        const midValue = minValue + (maxValue - minValue) / 2;
        this._colorScale.setRangeAndMidPoint(minValue, maxValue, midValue)

        for (let i = 0; i < selectedThpIndices.length; i++) {
            for (let j = 0; j < selectedWfrIndices.length; j++) {
                for (let k = 0; k < selectedGfrIndices.length; k++) {
                    for (let l = 0; l < selectedAlqIndices.length; l++) {
                        const thpIndex = selectedThpIndices[i]
                        const wfrIndex = selectedWfrIndices[j]
                        const gfrIndex = selectedGfrIndices[k]
                        const alqIndex = selectedAlqIndices[l]

                        const colorByParamIndex = {
                            [VfpParam.THP]: thpIndex, 
                            [VfpParam.WFR]: wfrIndex,
                            [VfpParam.GFR]: gfrIndex,
                            [VfpParam.ALQ]: alqIndex
                        }[colorBy]
                        const color = this._colorScale.getColorForValue(colorByValues[colorByParamIndex])

                        const trace = this.getSingleVfpTrace(thpIndex, wfrIndex, gfrIndex, alqIndex, pressureOption, color)
                        data.push(trace)
                    }
                }
            }
        }

        // Add color scale legend
        const colorScaleMarker: Partial<PlotMarker> = {
           ...this._colorScale.getAsPlotlyColorScaleMarkerObject(),
            colorbar: {
                title: this._vfpDataAccessor.getVfpParamLabel(colorBy, true),
                titleside: "right",
                ticks: "outside",
                len: 0.75,
            },
        };
        const parameterColorLegendTrace: Partial<PlotData> = {
            x: [null],
            y: [null],
            marker: colorScaleMarker,
            showlegend: false,
        };
        data.push(parameterColorLegendTrace);
        
        return data
    }

    private getSingleVfpTrace(thpIndex: number, wfrIndex: number, gfrIndex: number, alqIndex: number, pressureOption: PressureOption, color: string) : Partial<PlotData> { 
        const thpValue = this._vfpDataAccessor.getVfpParamValues(VfpParam.THP)[thpIndex]
        const wfrValue = this._vfpDataAccessor.getVfpParamValues(VfpParam.WFR)[wfrIndex]
        const gfrValue = this._vfpDataAccessor.getVfpParamValues(VfpParam.GFR)[gfrIndex]
        const alqValue = this._vfpDataAccessor.getVfpParamValues(VfpParam.ALQ)[alqIndex]

        const hovertext = `THP=${thpValue}<br>${this._vfpDataAccessor.getWfrType()}=${wfrValue}<br>${this._vfpDataAccessor.getGfrType()}=${gfrValue}<br>ALQ=${alqValue}`
        let bhpValues = this._vfpDataAccessor.getBhpValues(thpIndex, wfrIndex, gfrIndex, alqIndex)

        if (pressureOption === PressureOption.DP) {
            bhpValues = bhpValues.map(bhp => bhp - thpValue)
        }

        const trace: Partial<PlotData> =  {
            x: this._vfpDataAccessor.getFlowRateValues(),
            y: bhpValues,
            mode: "lines+markers",
            line: {
                color,
            },
            showlegend: false,
            hovertext: hovertext,
            hoverinfo: "y+x+text",
        };

        return trace
    }

}