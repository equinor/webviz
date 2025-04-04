import type { RelPermRealizationData_api } from "@api";
import type { EnsembleSet } from "@framework/EnsembleSet";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { ColorSet } from "@lib/utils/ColorSet";
import type { Figure } from "@modules/_shared/Figure";
import { makeSubplots } from "@modules/_shared/Figure";

import type { Rgb } from "culori";
import { parseHex } from "culori";
import type { Axis, PlotData } from "plotly.js";

import { createRelPermRealizationTrace, createRelPermRealizationTraceHovertext } from "./createRelPermTracesUtils";

import { ColorBy, GroupBy } from "../../typesAndEnums";
import type { RelPermSpec } from "../../typesAndEnums";

export enum SubplotLimitDirection {
    NONE = "none",
    COLUMNS = "columns",
    ROWS = "rows",
}
export type PlotBuilderOptions = {
    relPermSpecs: RelPermSpec[];
    ensembleSet: EnsembleSet;
    groupBy: GroupBy;
    colorBy: ColorBy;
    colorSet: ColorSet;
    width: number;
    height: number;
};

export class PlotBuilder {
    private _ensembleSet: EnsembleSet;
    private _relPermSpecs: RelPermSpec[];
    private _uniqueEnsembleIdents: RegularEnsembleIdent[] = [];
    private _uniqueSatNums: number[] = [];
    private _numberOfSubplots: number = 0;
    private _subplotOwner: GroupBy;
    private _colorSet: ColorSet;
    private _colorBy: ColorBy;
    private _figure: Figure;
    private _numRows = 1;
    private _numCols = 1;
    private _width = 0;
    private _height = 0;
    private _ensColors: Map<string, Rgb> = new Map<string, Rgb>();
    private _satNumColors: Map<number, Rgb> = new Map<number, Rgb>();
    private _curveColors: Map<string, Rgb> = new Map<string, Rgb>();
    private _axesOptions: { x: Partial<Axis> | null; y: Partial<Axis> | null } = { x: null, y: null };
    private _limitDirection: SubplotLimitDirection = SubplotLimitDirection.NONE;
    private _limitDirectionMaxElements = 0;

    constructor(
        { relPermSpecs, ensembleSet, groupBy, colorBy, colorSet, width, height }: PlotBuilderOptions,
        limitDirection: SubplotLimitDirection = SubplotLimitDirection.NONE,
        limitDirectionMaxElements: number = 0,
    ) {
        this._ensembleSet = ensembleSet;
        this._relPermSpecs = relPermSpecs;
        this._uniqueEnsembleIdents = Array.from(new Set(this._relPermSpecs.map((spec) => spec.ensembleIdent)));
        this._uniqueSatNums = Array.from(new Set(this._relPermSpecs.map((spec) => spec.satNum)));
        this._subplotOwner = groupBy;
        this._limitDirection = limitDirection;
        this._limitDirectionMaxElements = limitDirectionMaxElements;
        if (this._subplotOwner === GroupBy.ENSEMBLE) {
            this._numberOfSubplots = this._uniqueEnsembleIdents.length;
        } else if (this._subplotOwner === GroupBy.SATNUM) {
            this._numberOfSubplots = this._uniqueSatNums.length;
        } else if (this._subplotOwner === GroupBy.NONE) {
            this._numberOfSubplots = 1;
        }

        this._colorSet = colorSet;
        this._colorBy = colorBy;
        this._width = width;
        this._height = height;

        ({ numRows: this._numRows, numCols: this._numCols } = this.calcNumRowsAndCols(
            this._numberOfSubplots,
            this._limitDirection,
            this._limitDirectionMaxElements,
        ));

        this._figure = makeSubplots({
            numCols: this._numCols,
            numRows: this._numRows,
            height: this._height,
            width: this._width,
            margin: { t: 30, b: 20, l: 40, r: 40 },
            title: this._numberOfSubplots === 0 ? "Select curves to visualize" : undefined,
            xAxisType: "linear",
            showGrid: true,
            sharedXAxes: "all",
        });
        this.makeColorMaps();
    }
    addRealizationsTraces(
        relPermRealizationData: { relPermSpecification: RelPermSpec; data: RelPermRealizationData_api[] }[],
        opacity: number,
        lineWidth: number,
    ): void {
        const showLegendMapper = new Map<string, boolean>();
        for (const relPermSpecAndData of relPermRealizationData) {
            const ensemble = this._ensembleSet.getEnsemble(relPermSpecAndData.relPermSpecification.ensembleIdent);
            const satNum = relPermSpecAndData.relPermSpecification.satNum;
            const subplotIndex = this.getSubplotIndexFromSpec(relPermSpecAndData.relPermSpecification);
            if (subplotIndex === -1) {
                continue;
            }
            const { row, col } = this.getSubplotRowAndColFromIndex(subplotIndex);

            const plotData: Partial<PlotData>[] = [];
            relPermSpecAndData.data.forEach((realizationData) => {
                realizationData.curve_data_arr.forEach((curve) => {
                    const hoverLabel = createRelPermRealizationTraceHovertext(
                        ensemble.getDisplayName(),
                        satNum.toString(),
                        curve.curve_name,
                        realizationData.realization_id,
                    );
                    let showLegend = false;
                    let name = "";
                    let rgbColor: Rgb | undefined = undefined;
                    if (ColorBy.ENSEMBLE === this._colorBy) {
                        rgbColor = this._ensColors.get(ensemble.getDisplayName());
                        showLegend = !showLegendMapper.has(ensemble.getDisplayName());
                        showLegendMapper.set(ensemble.getDisplayName(), true);
                        name = ensemble.getDisplayName();
                    }
                    if (ColorBy.CURVE === this._colorBy) {
                        rgbColor = this._curveColors.get(curve.curve_name);
                        showLegend = !showLegendMapper.has(curve.curve_name);
                        showLegendMapper.set(curve.curve_name, true);
                        name = curve.curve_name;
                    }
                    if (ColorBy.SATNUM === this._colorBy) {
                        rgbColor = this._satNumColors.get(satNum);
                        showLegend = !showLegendMapper.has(satNum.toString());
                        showLegendMapper.set(satNum.toString(), true);
                        name = satNum.toString();
                    }

                    plotData.push(
                        createRelPermRealizationTrace({
                            hoverLabel: hoverLabel,
                            saturationValues: realizationData.saturation_values,
                            curveValues: curve.curve_values,
                            useGl: true,
                            name: name,
                            showLegend: showLegend,
                            legendGroupTitle: this._colorBy,
                            legendGroup: this._colorBy,
                            opacity: opacity,
                            lineWidth: lineWidth,
                            rgbColor: rgbColor ? rgbColor : (parseHex("#000000") as Rgb),
                        }),
                    );
                });
            });
            this._figure.addTraces(plotData, row, col);
        }
    }
    setXAxisOptions(options: Partial<Axis>): void {
        this._axesOptions.x = options;
    }

    setYAxisOptions(options: Partial<Axis>): void {
        this._axesOptions.y = options;
    }
    private calcNumRowsAndCols(
        numSubplots: number,
        limitDirection: SubplotLimitDirection,
        maxDirectionElements: number,
    ): { numRows: number; numCols: number } {
        if (numSubplots === 1) {
            return { numRows: 1, numCols: 1 };
        }

        if (limitDirection === SubplotLimitDirection.ROWS && maxDirectionElements > 0) {
            const numRows = Math.min(maxDirectionElements, numSubplots);
            const numCols = Math.ceil(numSubplots / numRows);
            return { numRows, numCols };
        }
        if (limitDirection === SubplotLimitDirection.COLUMNS && maxDirectionElements > 0) {
            const numCols = Math.min(maxDirectionElements, numSubplots);
            const numRows = Math.ceil(numSubplots / numCols);
            return { numRows, numCols };
        }

        // No direction limitation or invalid direction
        const numRows = Math.ceil(Math.sqrt(numSubplots));
        const numCols = Math.ceil(numSubplots / numRows);
        return { numRows, numCols };
    }
    private getSubplotIndexFromSpec(relPermSpec: RelPermSpec) {
        if (this._subplotOwner === GroupBy.SATNUM) {
            return this._uniqueSatNums.indexOf(relPermSpec.satNum);
        } else if (this._subplotOwner === GroupBy.ENSEMBLE) {
            return this._uniqueEnsembleIdents.findIndex((elm) => elm.equals(relPermSpec.ensembleIdent));
        } else if (this._subplotOwner === GroupBy.NONE) {
            return 0;
        }
        return -1;
    }
    private getSubplotRowAndColFromIndex(subplotIndex: number): { row: number; col: number } {
        let col = 1;
        let row = 1;
        if (this._limitDirection === SubplotLimitDirection.ROWS) {
            col = Math.floor(subplotIndex / this._numRows) + 1;
            row = (subplotIndex % this._numRows) + 1;
        } else {
            // Columns or no limit
            row = Math.floor(subplotIndex / this._numCols) + 1;
            col = (subplotIndex % this._numCols) + 1;
        }

        if (row > this._numRows || col > this._numCols) {
            throw new Error("Subplot index out of bounds");
        }

        return { row, col };
    }
    private updateSubplotTitles(): void {
        if (this._subplotOwner === GroupBy.ENSEMBLE) {
            this._uniqueEnsembleIdents.forEach((ensembleIdent, index) => {
                const newSubplotTitle = `${ensembleIdent.getEnsembleName()}`;
                const { row, col } = this.getSubplotRowAndColFromIndex(index);

                this._figure.updateSubplotTitle(newSubplotTitle, row, col);
            });
        }
        if (this._subplotOwner === GroupBy.SATNUM) {
            this._uniqueSatNums.forEach((satNum, index) => {
                const newSubplotTitle = `Satnum: ${satNum}`;
                const { row, col } = this.getSubplotRowAndColFromIndex(index);

                this._figure.updateSubplotTitle(newSubplotTitle, row, col);
            });
        }
    }
    private updateLayout() {
        const numRows = this._figure.getNumRows();
        const numCols = this._figure.getNumColumns();
        for (let row = 1; row <= numRows; row++) {
            for (let col = 1; col <= numCols; col++) {
                const axisIndex = this._figure.getAxisIndex(row, col);
                const yAxisKey = `yaxis${axisIndex}`;
                const xAxisKey = `xaxis${axisIndex}`;

                const oldLayout = this._figure.makeLayout();

                this._figure.updateLayout({
                    // @ts-expect-error - Ignore string type of xAxisKey for oldLayout[xAxisKey]
                    [xAxisKey]: { ...oldLayout[xAxisKey], ...this._axesOptions.x },
                    // @ts-expect-error - Ignore string type of yAxisKey for oldLayout[yAxisKey]
                    [yAxisKey]: { ...oldLayout[yAxisKey], ...this._axesOptions.y },
                });
            }
        }
    }
    private getRGBColorFromColorSet(index: number): Rgb {
        const validIndex = index % this._colorSet.getColorArray().length;

        return parseHex(this._colorSet.getColor(validIndex)) as Rgb;
    }
    private makeColorMaps(): void {
        const satNums = Array.from(new Set(this._relPermSpecs.map((spec) => spec.satNum)));
        const curveNames = Array.from(new Set(this._relPermSpecs.map((spec) => spec.curveNames).flat()));
        const ensembles = Array.from(
            new Set(this._relPermSpecs.map((spec) => this._ensembleSet.getEnsemble(spec.ensembleIdent))),
        );
        satNums.forEach((satNum) => {
            this._satNumColors.set(satNum, this.getRGBColorFromColorSet(satNum));
        });

        curveNames.forEach((curveName) => {
            this._curveColors.set(curveName, this.getRGBColorFromColorSet(curveNames.indexOf(curveName)));
        });
        ensembles.forEach((ensemble) => {
            this._ensColors.set(ensemble.getDisplayName(), parseHex(ensemble.getColor()) as Rgb);
        });
    }

    build(handleOnClick?: ((event: Readonly<Plotly.PlotMouseEvent>) => void) | undefined): React.ReactNode {
        this.updateLayout();
        this.updateSubplotTitles();
        return this._figure.makePlot({ onClick: handleOnClick });
    }
}
