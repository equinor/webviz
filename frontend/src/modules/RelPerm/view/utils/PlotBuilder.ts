import { RelPermRealizationData_api } from "@api";
import { EnsembleSet } from "@framework/EnsembleSet";
import { ColorSet } from "@lib/utils/ColorSet";
import { Figure, makeSubplots } from "@modules/_shared/Figure";

import { Rgb, parseHex } from "culori";
import { Axis, PlotData } from "plotly.js";

import { createRelPermRealizationTrace, createRelPermRealizationTraceHovertext } from "./createRelPermTracesUtils";

import { ColorBy, RelPermSpec, VisualizationSettings } from "../../typesAndEnums";

export enum SubplotOwner {
    CURVE = "Curve",
    ENSEMBLE = "Ensemble",
    SATNUM = "SatNum",
}

export class PlotBuilder {
    private _ensembleSet: EnsembleSet;
    private _relPermSpecs: RelPermSpec[];
    private _visualizationSettings: VisualizationSettings;
    private _numberOfSubplots: number = 0;
    private _subplotOwner: SubplotOwner;
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
    constructor(
        subplotOwner: SubplotOwner,
        _relPermSpecs: RelPermSpec[],
        ensembleSet: EnsembleSet,
        visualizationSettings: VisualizationSettings,
        colorSet: ColorSet,
        width: number,
        height: number,
    ) {
        this._ensembleSet = ensembleSet;
        this._relPermSpecs = _relPermSpecs;
        this._visualizationSettings = visualizationSettings;
        this._subplotOwner = subplotOwner;
        this._colorSet = colorSet;
        this._colorBy = visualizationSettings.colorBy;
        this._width = width;
        this._height = height;
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
    ): void {
        const plotData: Partial<PlotData>[] = [];
        const showLegendMapper = new Map<string, boolean>();
        relPermRealizationData.forEach((relPermSpecAndData) => {
            const ensemble = this._ensembleSet.getEnsemble(relPermSpecAndData.relPermSpecification.ensembleIdent);
            const satNum = relPermSpecAndData.relPermSpecification.satNum;

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
                        rgbColor = this._satNumColors.get(satNum - 1);
                        // console.log(this._satNumColors.get(satNum));
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
                            opacity: this._visualizationSettings.opacity,
                            lineWidth: this._visualizationSettings.lineWidth,
                            rgbColor: rgbColor ? rgbColor : (parseHex("#000000") as Rgb),
                        }),
                    );
                });
            });
        });
        this._figure.addTraces(plotData);
    }
    setXAxisOptions(options: Partial<Axis>): void {
        this._axesOptions.x = options;
    }

    setYAxisOptions(options: Partial<Axis>): void {
        this._axesOptions.y = options;
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
        const validIndex = index + (1 % this._colorSet.getColorArray().length);

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
        console.log(satNums);
        curveNames.forEach((curveName) => {
            this._curveColors.set(curveName, this.getRGBColorFromColorSet(curveNames.indexOf(curveName)));
        });
        ensembles.forEach((ensemble) => {
            this._ensColors.set(ensemble.getDisplayName(), parseHex(ensemble.getColor()) as Rgb);
        });
    }

    build(handleOnClick?: ((event: Readonly<Plotly.PlotMouseEvent>) => void) | undefined): React.ReactNode {
        this.updateLayout();

        return this._figure.makePlot({ onClick: handleOnClick });
    }
}
