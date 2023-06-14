import { PvtData } from '@api'

export type PlotDataType = {
    traces: TraceData[];
    dataName: string;
    xUnit: string;
    yUnit: string;
    pvtNum: number;
    phaseType: string;
    title: string;
}
export type TraceData = {
    x: number[];
    y: number[];
    ratio: number[];
}
// The different visualization options for each phase
export type PlotOptionType = {
    value: string;
    label: string;
}
const OilPlotOptions: PlotOptionType[] = [
    { value: "volumefactor", label: "Formation Volume Factor" },
    { value: "viscosity", label: "Viscosity" },
    { value: "density", label: "Density" },
    { value: "ratio", label: "Gas/Oil Ratio (Rs) at Psat" },

]
const GasPlotOptions: PlotOptionType[] = [
    { value: "volumefactor", label: "Formation Volume Factor" },
    { value: "viscosity", label: "Viscosity" },
    { value: "density", label: "Density" },
    { value: "ratio", label: "Vaporized Oil Ratio (Rv) at Psat" },

]
const WaterPlotOptions: PlotOptionType[] = [
    { value: "volumefactor", label: "Formation Volume Factor" },
    { value: "viscosity", label: "Viscosity" },
    { value: "density", label: "Density" },

]
export const getAvailablePlotsForPhase = (phase: string): PlotOptionType[] => {
    if (phase === "Oil") {
        return OilPlotOptions
    } else if (phase === "Gas") {
        return GasPlotOptions
    } else {
        return WaterPlotOptions
    }
}
export class PvtPlotAccessor {
    private pvtData: PvtData;

    constructor(pvtData: PvtData) {
        this.pvtData = pvtData;
    }


    getPlotLabel(dataValue: string): string {

        if (this.pvtData.phase === "Oil") {
            return OilPlotOptions.filter((plot) => plot.value === dataValue)[0].label
        }
        else if (this.pvtData.phase === "Gas") {
            return GasPlotOptions.filter((plot) => plot.value === dataValue)[0].label
        }
        else if (this.pvtData.phase === "Water") {
            return WaterPlotOptions.filter((plot) => plot.value === dataValue)[0]?.label || ""
        }
        else {
            return ""
        }
    }
    getPlotData(dataValue: string): PlotDataType {
        const title = this.getPlotLabel(dataValue) + "(" + this.pvtData.phase + ")"
        const pvtNum = this.pvtData.pvtnum
        const phaseType = this.pvtData.phase

        let traces: TraceData[] = []
        if (phaseType === "Oil" || phaseType === "Water") {
            traces = this.getTracesGroupedByRatio(dataValue)
        }
        else if (phaseType === "Gas") {
            traces = this.getTracesGroupedByPressure(dataValue)
        }
        const xUnit = this.getDataUnit("pressure")
        const yUnit = this.getDataUnit(dataValue)
        return {
            traces: traces,
            dataName: dataValue,
            xUnit: xUnit,
            yUnit: yUnit,
            pvtNum: pvtNum,
            phaseType: phaseType,
            title: title
        }
    }
    private getTracesGroupedByPressure(yResponse: string): TraceData[] {
        const pressureArray = this.getDataSeries("pressure")
        const ratioArray = this.getDataSeries("ratio")
        const uniquePressureValues = [...new Set(pressureArray)]
        const yArray = this.getDataSeries(yResponse)

        const traceData: TraceData[] = []
        uniquePressureValues.forEach((traceValue) => {

            //Get data indices relevant for each trace
            const indicesToKeep: number[] = []
            pressureArray.forEach((dataArrValue, index) => {
                if (dataArrValue === traceValue) {
                    indicesToKeep.push(index)
                }
            })

            const x = indicesToKeep.map((index) => pressureArray[index])
            const y = indicesToKeep.map((index) => yArray[index])
            const ratio = indicesToKeep.map((index) => ratioArray[index])
            traceData.push({ x: x, y: y, ratio: ratio })

        })
        return traceData
    }
    private getTracesGroupedByRatio(yResponse: string): TraceData[] {
        const pressureArray = this.getDataSeries("pressure")
        const ratioArray = this.getDataSeries("ratio")
        const uniqueRatioValues = [...new Set(ratioArray)]
        const yArray = this.getDataSeries(yResponse)


        const traceData: TraceData[] = []
        uniqueRatioValues.forEach((traceValue) => {

            //Get data indices relevant for each trace
            const indicesToKeep: number[] = []
            ratioArray.forEach((dataArrValue, index) => {
                if (dataArrValue === traceValue) {
                    indicesToKeep.push(index)
                }
            })

            const x = indicesToKeep.map((index) => pressureArray[index])
            const y = indicesToKeep.map((index) => yArray[index])
            const ratio = indicesToKeep.map((index) => ratioArray[index])
            traceData.push({ x: x, y: y, ratio: ratio })

        })
        return traceData
    }
    private getDataSeries(dataValue: string): number[] {
        if (dataValue === "volumefactor") {
            return this.pvtData.volumefactor
        } else if (dataValue === "viscosity") {
            return this.pvtData.viscosity
        } else if (dataValue === "density") {
            return this.pvtData.density
        } else if (dataValue === "ratio") {
            return this.pvtData.ratio
        } else if (dataValue === "pressure") {
            return this.pvtData.pressure
        } else {
            return []
        }
    }
    private getDataUnit(dataValue: string): string {
        if (dataValue === "volumefactor") {
            return this.pvtData.volumefactor_unit
        } else if (dataValue === "viscosity") {
            return this.pvtData.viscosity_unit
        } else if (dataValue === "density") {
            return this.pvtData.density_unit
        } else if (dataValue === "ratio") {
            return this.pvtData.ratio_unit
        } else if (dataValue === "pressure") {
            return this.pvtData.pressure_unit
        } else {
            return ""
        }
    }

}
