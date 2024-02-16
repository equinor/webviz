import { Layout, PlotData } from "plotly.js";

import { PressureDependentVariable, PvtTableCollection } from "../typesAndEnums";
import { Figure, makeSubplots } from "@modules/_shared/Figure";
import { ColorSet } from "@lib/utils/ColorSet";
import { Size2D } from "@lib/utils/geometry";
import { PvtData_api } from "@api";

export class PvtPlotBuilder {
    private _tableCollections: PvtTableCollection[];
    private _figure: Figure | null = null;

    constructor(tableCollections: PvtTableCollection[]) {
        this._tableCollections = tableCollections;
    }

    makeLayout(selectedPlots: PressureDependentVariable[], size: Size2D): void {
        const numPlots = selectedPlots.length;
        const numRows = Math.ceil(numPlots / 2);
        const numCols = Math.min(numPlots, 2);

        this._figure = makeSubplots({
            width: size.width,
            height: size.height,
            numRows,
            numCols,
            sharedXAxes: false,
            sharedYAxes: false,
            margin: { t: 20, b: 40, l: 40, r: 20 },
        });
    }

    makeTraces(dependentVariables: PressureDependentVariable[], pvtNums: number[], phases: string[], colorSet: ColorSet): void {
        const traces: {variable: PressureDependentVariable, plotData: PlotData[]}[] = [];

        for (const tableCollection of this._tableCollections) {
            for (const table of tableCollection.tables) {
                if (pvtNums.includes(table.pvtnum) && phases.includes(table.phase)) {
                    const color = colorSet.getNextColor();
                    const ratioTracesMaps = new Map<PressureDependentVariable, Map<number, PlotData>>();
                    for (const dependentVariable of dependentVariables) {
                        const ratioTracesMap = new Map<number, PlotData>();
                        ratioTracesMaps.set(dependentVariable, ratioTracesMap);
                    }

                    for (let i = 0; i < table.pressure.length; i++) {
                        const pressure = table.pressure[i];

                        for (const dependentVariable of dependentVariables) {
                            const
                            if (dependentVariable === PressureDependentVariable.FORMATION_VOLUME_FACTOR) {
                                const dependentVariableValue = table[dependentVariable as keyof PvtData_api][i];
                                const ratio = table.ratio[i];

                                let trace = ratioTracesMaps.get(dependentVariable)!.get(ratio);
                                if (!trace) {
                                    trace = {
                                        x: [],
                                        y: [],
                                        type: "scatter",
                                        mode: "lines",
                                        line: { color },
                                        name: table.name + " ratio: " + ratio,
                                    };
                                    ratioTracesMaps.get(dependentVariable)!.set(ratio, trace);
                                }

                                trace.x.push(pressure);
                                trace.y.push(dependentVariableValue);
                            }
                            const dependentVariableValue = table[dependentVariable as keyof PvtData_api][i];
                            const ratio = table.ratio[i];

                            let trace = ratioTracesMaps.get(dependentVariable)!.get(ratio);
                            if (!trace) {
                                trace = {
                                    x: [],
                                    y: [],
                                    type: "scatter",
                                    mode: "lines",
                                    line: { color },
                                    name: table.name + " ratio: " + ratio,
                                };
                                ratioTracesMaps.get(dependentVariable)!.set(ratio, trace);
                            }

                            trace.x.push(pressure);
                            trace.y.push(dependentVariableValue);
                        }


                        const dependentVariable = table[dependentVariable][i];
                        const ratio = table.ratio[i];

                        let trace = ratioTracesMap.get(ratio);
                        if (!trace) {
                            trace = {
                                x: [],
                                y: [],
                                type: "scatter",
                                mode: "lines",
                                line: { color },
                                name: table.name + " ratio: " + ratio,
                            };
                            ratioTracesMap.set(ratio, trace);
                        }

                        trace.x.push(pressure);
                        trace.y.push(dependentVariable);
                    }

                    const trace: PlotData = {
                        x: table.pressure,
                        y: table.dependentVariable,
                        type: "scatter",
                        mode: "lines",
                        line: { color },
                        name: table.name,
                    };
                    traces.push(trace);
                }
            }
        }
    }
}
