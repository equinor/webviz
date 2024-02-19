import { ColorSet } from "@lib/utils/ColorSet";
import { Size2D } from "@lib/utils/geometry";
import { Figure, makeSubplots } from "@modules/_shared/Figure";

import { Layout, PlotData } from "plotly.js";

import { PvtDataAccessor } from "./PvtDataAccessor";

import {
    ColorBy,
    PRESSURE_DEPENDENT_VARIABLE_TO_DISPLAY_NAME,
    PhaseType,
    PressureDependentVariable,
} from "../typesAndEnums";

type TracePointData = {
    pressure: number;
    dependentVariableValue: number;
};

export class PvtPlotBuilder {
    private _pvtDataAccessor: PvtDataAccessor;
    private _figure: Figure | null = null;
    private _numPlots = 0;

    constructor(pvtDataAccessor: PvtDataAccessor) {
        this._pvtDataAccessor = pvtDataAccessor;
    }

    makeLayout(selectedPlots: PressureDependentVariable[], size: Size2D): void {
        this._numPlots = selectedPlots.length;
        const numRows = Math.ceil(this._numPlots / 2);
        const numCols = Math.min(this._numPlots, 2);
        const subplotTitles: string[] = [];

        const patches: Partial<Layout>[] = [];

        for (let row = 1; row <= numRows; row++) {
            for (let col = 1; col <= numCols; col++) {
                const titleIndex = (numRows - row) * numCols + (col - 1);
                const axisIndex = (row - 1) * numCols + col;

                const dependentVariable = selectedPlots.at(titleIndex) ?? null;
                if (!dependentVariable) {
                    subplotTitles.push("");
                    continue;
                }
                const title = PRESSURE_DEPENDENT_VARIABLE_TO_DISPLAY_NAME[dependentVariable];
                subplotTitles.push(title);
                const xUnit = this._pvtDataAccessor.getPressureUnit();
                const yUnit = this._pvtDataAccessor.getDependentVariableUnit(dependentVariable);
                const patch: Partial<Layout> = {
                    title,
                    [`xaxis${axisIndex}`]: { title: "Pressure [" + xUnit + "]" },
                    [`yaxis${axisIndex}`]: { title: `[${yUnit}]` },
                };

                patches.push(patch);
            }
        }

        this._figure = makeSubplots({
            width: size.width,
            height: size.height,
            numRows,
            numCols,
            sharedXAxes: false,
            sharedYAxes: false,
            showGrid: true,
            margin: { t: 30, b: 40, l: 40, r: 10 },
            subplotTitles: subplotTitles,
        });

        for (const patch of patches) {
            this._figure.updateLayout(patch);
        }
    }

    makeTraces(
        dependentVariables: PressureDependentVariable[],
        pvtNums: number[],
        phase: PhaseType,
        colorBy: ColorBy,
        colorSet: ColorSet
    ): void {
        if (!this._figure) {
            throw new Error("Layout not set");
        }

        const tableCollections = this._pvtDataAccessor.getTableCollections();

        let legendTitle = "";
        const colors: string[] = [];
        colors.push(colorSet.getFirstColor());
        if (colorBy === ColorBy.PVT_NUM) {
            for (let i = 1; i < pvtNums.length; i++) {
                colors.push(colorSet.getNextColor());
            }
            legendTitle = "PVTNum";
        } else {
            for (let i = 1; i < tableCollections.length; i++) {
                colors.push(colorSet.getNextColor());
            }
            legendTitle = "Ens + Real";
        }

        this._figure.updateLayout({
            legend: {
                title: {
                    text: legendTitle,
                },
                orientation: "v",
            },
        });

        let collectionIndex = 0;
        let pvtNumIndex = 0;
        for (const tableCollection of tableCollections) {
            pvtNumIndex = 0;
            for (const table of tableCollection.tables) {
                if (pvtNums.includes(table.pvtnum) && phase === table.phase) {
                    const groupedTracesMaps = new Map<PressureDependentVariable, Map<number, TracePointData[]>>();

                    for (let i = 0; i < table.pressure.length; i++) {
                        for (const dependentVariable of dependentVariables) {
                            if (
                                phase === PhaseType.WATER &&
                                dependentVariable === PressureDependentVariable.FLUID_RATIO
                            ) {
                                continue;
                            }

                            let dependentVariableValue = 0;
                            switch (dependentVariable) {
                                case PressureDependentVariable.FORMATION_VOLUME_FACTOR:
                                    dependentVariableValue = table.volumefactor[i];
                                    break;
                                case PressureDependentVariable.VISCOSITY:
                                    dependentVariableValue = table.viscosity[i];
                                    break;
                                case PressureDependentVariable.DENSITY:
                                    dependentVariableValue = table.density[i];
                                    break;
                                case PressureDependentVariable.FLUID_RATIO:
                                    dependentVariableValue = table.ratio[i];
                                    break;
                            }

                            let dependentVariableMap = groupedTracesMaps.get(dependentVariable);
                            if (!dependentVariableMap) {
                                dependentVariableMap = new Map<number, TracePointData[]>();
                                groupedTracesMaps.set(dependentVariable, dependentVariableMap);
                            }

                            let groupValue = 0;
                            if (phase === PhaseType.OIL) {
                                groupValue = table.ratio[i];
                            } else if (phase === PhaseType.GAS) {
                                groupValue = table.pressure[i];
                            }

                            let tracePointDataArray = dependentVariableMap.get(groupValue);
                            if (tracePointDataArray === undefined) {
                                tracePointDataArray = [];
                                dependentVariableMap.set(groupValue, tracePointDataArray);
                            }
                            if (dependentVariable === PressureDependentVariable.FLUID_RATIO) {
                                if (tracePointDataArray.length > 0) {
                                    continue;
                                }
                            }
                            tracePointDataArray.push({
                                pressure: table.pressure[i],
                                dependentVariableValue,
                            });
                        }
                    }

                    let i = 0;
                    let color = colors[collectionIndex];
                    if (colorBy === ColorBy.PVT_NUM) {
                        color = colors[pvtNumIndex];
                    }

                    for (const [dependentVariable, dependentVariableMap] of groupedTracesMaps) {
                        const row = Math.ceil(this._numPlots / 2) - Math.floor(i / 2);
                        const col = (i % 2) + 1;
                        const borderTracePoints: TracePointData[] = [];
                        for (const [groupValue, tracePointDataArray] of dependentVariableMap) {
                            const trace: Partial<PlotData> = {
                                x: tracePointDataArray.map((el) => el.pressure),
                                y: tracePointDataArray.map((el) => el.dependentVariableValue),
                                mode: "lines+markers",
                                name: `${dependentVariable} ${groupValue}`,
                                line: {
                                    color,
                                },
                                showlegend: false,
                            };

                            this._figure.addTrace(trace, row, col);
                            borderTracePoints.push(tracePointDataArray[0]);
                        }

                        const borderTrace: Partial<PlotData> = {
                            x: borderTracePoints.map((el) => el.pressure),
                            y: borderTracePoints.map((el) => el.dependentVariableValue),
                            mode: "lines",
                            name: `PVTNum ${table.pvtnum}`,
                            line: {
                                color,
                            },
                            showlegend: false,
                        };

                        this._figure.addTrace(borderTrace, row, col);

                        if (
                            i === 0 &&
                            ((colorBy === ColorBy.PVT_NUM && collectionIndex === 0) ||
                                (colorBy === ColorBy.ENSEMBLE && pvtNumIndex === 0))
                        ) {
                            let traceLegendName = "";
                            if (colorBy === ColorBy.PVT_NUM) {
                                traceLegendName = table.pvtnum.toString();
                            } else {
                                traceLegendName =
                                    tableCollection.ensembleIdent.getEnsembleName() +
                                    " - " +
                                    tableCollection.realization;
                            }

                            this._figure.addTrace({
                                x: [null],
                                y: [null],
                                mode: "lines",
                                name: traceLegendName,
                                line: {
                                    color,
                                },
                                showlegend: true,
                                visible: "legendonly",
                                legendgroup: legendTitle,
                            });
                        }

                        i++;
                    }
                    pvtNumIndex++;
                }
            }
            collectionIndex++;
        }
    }

    makePlot(): React.ReactNode {
        if (!this._figure) {
            throw new Error("Layout not set");
        }

        return this._figure.makePlot();
    }
}
