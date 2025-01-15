import React from "react";

import {
    SummaryVectorObservations_api,
    VectorHistoricalData_api,
    VectorRealizationData_api,
    VectorStatisticData_api,
} from "@api";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import { ColorSet } from "@lib/utils/ColorSet";
import { VectorSpec } from "@modules/SimulationTimeSeries/typesAndEnums";
import { CoordinateReference, Figure, makeSubplots } from "@modules/_shared/Figure";
import { simulationUnitReformat, simulationVectorDescription } from "@modules/_shared/reservoirSimulationStringUtils";

import { Annotations, PlotMarker, Shape } from "plotly.js";

import {
    createHistoricalVectorTrace,
    createVectorFanchartTraces,
    createVectorObservationsTraces,
    createVectorRealizationTrace,
    createVectorRealizationTraces,
    createVectorStatisticsTraces,
} from "./PlotlyTraceUtils/createVectorTracesUtils";
import { scaleHexColorLightness } from "./colorUtils";
import { EnsemblesContinuousParameterColoring } from "./ensemblesContinuousParameterColoring";
import { TimeSeriesPlotData } from "./timeSeriesPlotData";

type VectorNameUnitMap = { [vectorName: string]: string };
type HexColorMap = { [key: string]: string };
export enum SubplotOwner {
    VECTOR = "Vector",
    ENSEMBLE = "Ensemble",
}

/**
    Helper class to build wanted plot component by use of plot figure, with subplot per selected vector
    or per selected ensemble according to grouping selection.

 */
export class PlotBuilder {
    private _selectedVectorSpecifications: VectorSpec[] = [];
    private _numberOfSubplots = 0;
    private _subplotOwner: SubplotOwner;

    private _addedVectorsLegendTracker: string[] = [];
    private _addedEnsemblesLegendTracker: (RegularEnsembleIdent | DeltaEnsembleIdent)[] = [];

    private _uniqueEnsembleIdents: (RegularEnsembleIdent | DeltaEnsembleIdent)[] = [];
    private _uniqueVectorNames: string[] = [];

    private _vectorHexColors: HexColorMap = {};

    private _makeEnsembleDisplayName: (ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent) => string;

    private _hasRealizationsTracesColoredByParameter = false;
    private _hasHistoryTraces = false;
    private _hasObservationTraces = false;

    private _historyVectorColor = "black";
    private _observationColor = "black";

    private _width = 0;
    private _height = 0;

    private _defaultHoverTemplate = "(%{x}, %{y})<br>";
    private _scatterType: "scatter" | "scattergl";

    private _ensemblesParameterColoring: EnsemblesContinuousParameterColoring | null = null;
    private _parameterFallbackColor = "#808080";

    private _traceFallbackColor = "#000000";

    private _vectorNameUnitMap: VectorNameUnitMap = {};

    private _timeAnnotationTimestamps: number[] = [];

    private _figure: Figure;
    private _numRows = 1;
    private _numCols = 1;
    private _subplotTitles: string[] = [];

    constructor(
        subplotOwner: SubplotOwner,
        selectedVectorSpecifications: VectorSpec[],
        makeEnsembleDisplayName: (ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent) => string,
        colorSet: ColorSet,
        width: number,
        height: number,
        ensemblesParameterColoring?: EnsemblesContinuousParameterColoring,
        scatterType: "scatter" | "scattergl" = "scatter"
    ) {
        this._selectedVectorSpecifications = selectedVectorSpecifications;
        this._width = width;
        this._height = height;
        this._makeEnsembleDisplayName = makeEnsembleDisplayName;

        this._uniqueVectorNames = [...new Set(selectedVectorSpecifications.map((vec) => vec.vectorName))];
        this._uniqueEnsembleIdents = [];
        for (const vectorSpecification of selectedVectorSpecifications) {
            if (this._uniqueEnsembleIdents.some((elm) => elm.equals(vectorSpecification.ensembleIdent))) continue;
            this._uniqueEnsembleIdents.push(vectorSpecification.ensembleIdent);
        }

        // Create map with color for each vector and ensemble
        this._uniqueVectorNames.forEach((vectorName, index) => {
            const color = index === 0 ? colorSet.getFirstColor() : colorSet.getNextColor();
            this._vectorHexColors[vectorName] = color;
        });

        this._ensemblesParameterColoring = ensemblesParameterColoring ?? null;
        this._scatterType = scatterType;

        this._subplotOwner = subplotOwner;
        if (this._subplotOwner === SubplotOwner.VECTOR) {
            this._numberOfSubplots = this._uniqueVectorNames.length;
            this._subplotTitles = this._uniqueVectorNames.map((vectorName) =>
                this.createVectorSubplotTitle(vectorName)
            );
        } else if (this._subplotOwner === SubplotOwner.ENSEMBLE) {
            this._numberOfSubplots = this._uniqueEnsembleIdents.length;
            this._subplotTitles = this._uniqueEnsembleIdents.map(
                (ensembleIdent) => `Ensemble: ${this._makeEnsembleDisplayName(ensembleIdent)}`
            );
        }

        // Create figure
        ({ numRows: this._numRows, numCols: this._numCols } = this.calcNumRowsAndCols(this._numberOfSubplots));
        this._figure = makeSubplots({
            numCols: this._numCols,
            numRows: this._numRows,
            height: this._height,
            width: this._width,
            margin: { t: 30, b: 40, l: 40, r: 40 },
            title: this._subplotTitles.length === 0 ? "Select vectors to visualize" : undefined,
            subplotTitles: this._subplotTitles,
            xAxisType: "date",
            showGrid: true,
            sharedXAxes: "columns",
        });
    }

    private calcNumRowsAndCols(
        numSubplots: number,
        maxNumRows?: number,
        maxNumCols?: number
    ): { numRows: number; numCols: number } {
        if (numSubplots === 1) {
            return { numRows: 1, numCols: 1 };
        }

        if (maxNumCols && maxNumRows) {
            throw new Error("Only one of maxNumCols or maxNumRows can be defined");
        }

        if (maxNumRows !== undefined) {
            const numRows = Math.min(maxNumRows, Math.ceil(Math.sqrt(numSubplots)));
            const numCols = Math.ceil(numSubplots / numRows);
            return { numRows, numCols };
        }
        if (maxNumCols !== undefined) {
            const numCols = Math.min(maxNumCols, Math.ceil(Math.sqrt(numSubplots)));
            const numRows = Math.ceil(numSubplots / numCols);
            return { numRows, numCols };
        }

        const numRows = Math.ceil(Math.sqrt(numSubplots));
        const numCols = Math.ceil(numSubplots / numRows);
        return { numRows, numCols };
    }

    /**
     * Get index of subplot for vector specification
     */
    private getSubplotIndex(vectorSpecification: VectorSpec) {
        if (this._subplotOwner === SubplotOwner.VECTOR) {
            return this._uniqueVectorNames.indexOf(vectorSpecification.vectorName);
        } else if (this._subplotOwner === SubplotOwner.ENSEMBLE) {
            return this._uniqueEnsembleIdents.findIndex((elm) => elm.equals(vectorSpecification.ensembleIdent));
        }
        return -1;
    }

    /**
     * Get row and column number for subplot from subplot index
     *
     * The subplot index is 0-based, whilst the row and column numbers are 1-based.
     *
     * The subplots for the subplot utility are arranged top-left to bottom-right, which implies
     * the following layout for a 3x3 grid (r1 = row 1, c1 = column 1):
     *
     *              r1c1 r1c2 r1c3
     *              r2c1 r2c2 r2c3
     *              r3c1 r3c2 r3c3
     *
     */
    private getSubplotRowAndColFromIndex(subplotIndex: number): { row: number; col: number } {
        const row = Math.floor(subplotIndex / this._numCols) + 1;
        const col = (subplotIndex % this._numCols) + 1;

        if (row > this._numRows || col > this._numCols) {
            throw new Error("Subplot index out of bounds");
        }

        return { row, col };
    }

    /**
     * Update subplot titles for vector subplots
     *
     * The subplot titles are updated based on the vector name and unit provided in the vectorNameUnitMap.
     * The unit is provided after traces are added, thus the subplot titles are updated after traces are added.
     */
    private updateVectorSubplotTitles(): void {
        if (this._subplotOwner !== SubplotOwner.VECTOR) {
            return;
        }

        for (const vectorName of this._uniqueVectorNames) {
            const getSubplotIndex = this._uniqueVectorNames.indexOf(vectorName);
            if (getSubplotIndex === -1) {
                continue;
            }

            const { row, col } = this.getSubplotRowAndColFromIndex(getSubplotIndex);
            if (!this._figure.hasSubplotTitle(row, col)) {
                continue;
            }

            const newSubplotTitle = this.createVectorSubplotTitle(vectorName);
            this._figure.updateSubplotTitle(newSubplotTitle, row, col);
        }
    }

    build(handleOnClick?: ((event: Readonly<Plotly.PlotMouseEvent>) => void) | undefined): React.ReactNode {
        // Post-process after all traces are added
        this.createGraphLegends();
        this.updateVectorSubplotTitles();

        for (let index = 0; index < this._numberOfSubplots; index++) {
            const { row, col } = this.getSubplotRowAndColFromIndex(index);
            for (const timeAnnotation of this.createTimeAnnotations()) {
                this._figure.addAnnotation(
                    timeAnnotation,
                    row,
                    col,
                    CoordinateReference.DATA,
                    CoordinateReference.DOMAIN
                );
            }
            for (const timeShape of this.createTimeShapes()) {
                this._figure.addShape(timeShape, row, col, CoordinateReference.DATA, CoordinateReference.DOMAIN);
            }
        }

        return this._figure.makePlot({ onClick: handleOnClick });
    }

    addRealizationTracesColoredByParameter(
        vectorsRealizationData: { vectorSpecification: VectorSpec; data: VectorRealizationData_api[] }[]
    ): void {
        if (!this._ensemblesParameterColoring) {
            throw new Error(
                "EnsemblesParameterColoring is not defined. Must be provided in PlotBuilder constructor to add realization traces colored by parameter"
            );
        }

        // Only allow selected vectors
        const selectedVectorsRealizationData = vectorsRealizationData.filter((vec) =>
            this._selectedVectorSpecifications.some(
                (selectedVec) => selectedVec.vectorName === vec.vectorSpecification.vectorName
            )
        );

        const addLegendForTraces = false;

        // Create traces for each vector
        for (const elm of selectedVectorsRealizationData) {
            const subplotIndex = this.getSubplotIndex(elm.vectorSpecification);
            if (subplotIndex === -1) continue;

            const ensembleIdent = elm.vectorSpecification.ensembleIdent;

            // As of now only regular ensembles are supported
            if (!isEnsembleIdentOfType(ensembleIdent, RegularEnsembleIdent)) continue;

            const hasParameterForEnsemble = this._ensemblesParameterColoring.hasParameterForEnsemble(ensembleIdent);

            // Add traces for each realization with color based on parameter value
            for (const realizationData of elm.data) {
                let parameterColor = this._parameterFallbackColor;
                const hasParameterValueForRealization = this._ensemblesParameterColoring.hasParameterRealizationValue(
                    ensembleIdent,
                    realizationData.realization
                );

                if (hasParameterForEnsemble && hasParameterValueForRealization) {
                    const value = this._ensemblesParameterColoring.getParameterRealizationValue(
                        ensembleIdent,
                        realizationData.realization
                    );
                    parameterColor = this._ensemblesParameterColoring.getColorScale().getColorForValue(value);
                }

                const name = this.makeTraceNameFromVectorSpecification(elm.vectorSpecification);
                const vectorRealizationTrace = createVectorRealizationTrace({
                    vectorRealizationData: realizationData,
                    name: name,
                    color: parameterColor,
                    legendGroup: this._makeEnsembleDisplayName(elm.vectorSpecification.ensembleIdent),
                    hoverTemplate: this._defaultHoverTemplate,
                    showLegend: addLegendForTraces,
                    yaxis: `y${subplotIndex + 1}`,
                    type: this._scatterType,
                });

                const { row, col } = this.getSubplotRowAndColFromIndex(subplotIndex);
                this._figure.addTrace(vectorRealizationTrace, row, col);

                this._hasRealizationsTracesColoredByParameter = true;
                this.insertVectorNameAndUnitIntoMap(elm.vectorSpecification.vectorName, realizationData.unit);
            }
        }
    }

    addRealizationsTraces(
        vectorsRealizationData: { vectorSpecification: VectorSpec; data: VectorRealizationData_api[] }[],
        useIncreasedBrightness: boolean
    ): void {
        // Only allow selected vectors
        const selectedVectorsRealizationData = vectorsRealizationData.filter((vec) =>
            this._selectedVectorSpecifications.some(
                (selectedVec) => selectedVec.vectorName === vec.vectorSpecification.vectorName
            )
        );

        const addLegendForTraces = false;

        // Create traces for each vector
        for (const elm of selectedVectorsRealizationData) {
            const subplotIndex = this.getSubplotIndex(elm.vectorSpecification);
            if (subplotIndex === -1) continue;

            // Get legend group and color
            const legendGroup = this.getLegendGroupAndUpdateTracker(elm.vectorSpecification);
            let color = this.getHexColor(elm.vectorSpecification);
            if (useIncreasedBrightness) {
                color = scaleHexColorLightness(color, 1.3) ?? color;
            }

            const name = this.makeTraceNameFromVectorSpecification(elm.vectorSpecification);
            const vectorRealizationTraces = createVectorRealizationTraces({
                vectorRealizationsData: elm.data,
                name: name,
                color: color,
                legendGroup: legendGroup,
                hoverTemplate: this._defaultHoverTemplate,
                showLegend: addLegendForTraces,
                type: this._scatterType,
            });

            const { row, col } = this.getSubplotRowAndColFromIndex(subplotIndex);
            this._figure.addTraces(vectorRealizationTraces, row, col);

            if (elm.data.length !== 0) {
                this.insertVectorNameAndUnitIntoMap(elm.vectorSpecification.vectorName, elm.data[0].unit);
            }
        }
    }

    addFanchartTraces(
        vectorsStatisticData: { vectorSpecification: VectorSpec; data: VectorStatisticData_api }[]
    ): void {
        // Only allow selected vectors
        const selectedVectorsStatisticData = vectorsStatisticData.filter((vec) =>
            this._selectedVectorSpecifications.some(
                (selectedVec) => selectedVec.vectorName === vec.vectorSpecification.vectorName
            )
        );

        // Create traces for each vector
        for (const elm of selectedVectorsStatisticData) {
            const subplotIndex = this.getSubplotIndex(elm.vectorSpecification);
            if (subplotIndex === -1) continue;

            // Get legend group and color
            const legendGroup = this.getLegendGroupAndUpdateTracker(elm.vectorSpecification);
            const color = this.getHexColor(elm.vectorSpecification);

            const name = this.makeTraceNameFromVectorSpecification(elm.vectorSpecification);
            const vectorFanchartTraces = createVectorFanchartTraces({
                vectorStatisticData: elm.data,
                hexColor: color,
                legendGroup: legendGroup,
                name: name,
                yaxis: `y${subplotIndex + 1}`,
                type: this._scatterType,
            });

            const { row, col } = this.getSubplotRowAndColFromIndex(subplotIndex);
            this._figure.addTraces(vectorFanchartTraces, row, col);

            this.insertVectorNameAndUnitIntoMap(elm.vectorSpecification.vectorName, elm.data.unit);
        }
    }

    addStatisticsTraces(
        vectorsStatisticData: { vectorSpecification: VectorSpec; data: VectorStatisticData_api }[],
        highlightStatisticTraces: boolean
    ): void {
        // Only allow selected vectors
        const selectedVectorsStatisticData = vectorsStatisticData.filter((vec) =>
            this._selectedVectorSpecifications.some(
                (selectedVec) => selectedVec.vectorName === vec.vectorSpecification.vectorName
            )
        );

        const lineWidth = highlightStatisticTraces ? 3 : 2;

        // Create traces for each vector
        for (const elm of selectedVectorsStatisticData) {
            const subplotIndex = this.getSubplotIndex(elm.vectorSpecification);
            if (subplotIndex === -1) continue;

            // Get legend group and color
            const legendGroup = this.getLegendGroupAndUpdateTracker(elm.vectorSpecification);
            const color = this.getHexColor(elm.vectorSpecification);

            const name = this.makeTraceNameFromVectorSpecification(elm.vectorSpecification);
            const vectorStatisticsTraces = createVectorStatisticsTraces({
                vectorStatisticData: elm.data,
                hexColor: color,
                legendGroup: legendGroup,
                name: name,
                lineWidth: lineWidth,
                type: this._scatterType,
            });

            const { row, col } = this.getSubplotRowAndColFromIndex(subplotIndex);
            this._figure.addTraces(vectorStatisticsTraces, row, col);

            this.insertVectorNameAndUnitIntoMap(elm.vectorSpecification.vectorName, elm.data.unit);
        }
    }

    addHistoryTraces(
        vectorsHistoricalData: {
            vectorSpecification: VectorSpec;
            data: VectorHistoricalData_api;
        }[]
    ): void {
        // Only allow selected vectors
        const selectedVectorsHistoricalData = vectorsHistoricalData.filter((vec) =>
            this._selectedVectorSpecifications.some(
                (selectedVec) => selectedVec.vectorName === vec.vectorSpecification.vectorName
            )
        );

        // Create traces for each vector
        for (const elm of selectedVectorsHistoricalData) {
            const subplotIndex = this.getSubplotIndex(elm.vectorSpecification);
            if (subplotIndex === -1) continue;

            const name = this.makeTraceNameFromVectorSpecification(elm.vectorSpecification);
            const vectorHistoryTrace = createHistoricalVectorTrace({
                vectorHistoricalData: elm.data,
                name: name,
                color: this._historyVectorColor,
                type: this._scatterType,
            });

            const { row, col } = this.getSubplotRowAndColFromIndex(subplotIndex);
            this._figure.addTrace(vectorHistoryTrace, row, col);

            this._hasHistoryTraces = true;
            this.insertVectorNameAndUnitIntoMap(elm.vectorSpecification.vectorName, elm.data.unit);
        }
    }

    addObservationsTraces(
        vectorsObservationData: {
            vectorSpecification: VectorSpec;
            data: SummaryVectorObservations_api;
        }[]
    ): void {
        // Only allow selected vectors
        const selectedVectorsObservationData = vectorsObservationData.filter((vec) =>
            this._selectedVectorSpecifications.some(
                (selectedVec) => selectedVec.vectorName === vec.vectorSpecification.vectorName
            )
        );

        // Create traces for each vector
        for (const elm of selectedVectorsObservationData) {
            const subplotIndex = this.getSubplotIndex(elm.vectorSpecification);
            if (subplotIndex === -1) continue;

            const name = this.makeTraceNameFromVectorSpecification(elm.vectorSpecification);
            const vectorObservationsTraces = createVectorObservationsTraces({
                vectorObservations: elm.data.observations,
                name: name,
                color: this._observationColor,
                type: this._scatterType,
            });

            const { row, col } = this.getSubplotRowAndColFromIndex(subplotIndex);
            this._figure.addTraces(vectorObservationsTraces, row, col);

            this._hasObservationTraces = true;
        }
    }

    addTimeAnnotation(timestampUtcMs: number): void {
        this._timeAnnotationTimestamps.push(timestampUtcMs);
    }

    private createTimeAnnotations(): Partial<Annotations>[] {
        const timeAnnotations: Partial<Annotations>[] = [];

        for (const timestampUtcMs of this._timeAnnotationTimestamps) {
            timeAnnotations.push({
                x: timestampUtcMs, // Data coordinate
                y: -0.02, // Domain coordinate [0, 1]
                text: timestampUtcMsToCompactIsoString(timestampUtcMs),
                showarrow: false,
                arrowhead: 0,
                bgcolor: "rgba(255, 255, 255, 1)",
                bordercolor: "rgba(255, 0, 0, 1)",
                borderwidth: 1,
                borderpad: 4,
            });
        }

        return timeAnnotations;
    }

    private createTimeShapes(): Partial<Shape>[] {
        const timeShapes: Partial<Shape>[] = [];

        for (const timestampUtcMs of this._timeAnnotationTimestamps) {
            timeShapes.push({
                type: "line",
                x0: timestampUtcMs, // Data coordinate
                x1: timestampUtcMs, // Data coordinate
                y0: 0, // Domain coordinate
                y1: 1, // Domain coordinate
                line: {
                    color: "red",
                    width: 1,
                    dash: "dot",
                },
            });
        }

        return timeShapes;
    }

    /**
     * Create legend trace with empty x and y values to show legend for each vector/ensemble
     *
     * The trace is linked with specific legendgroup, and placed at subplot given by xaxis and yaxis.
     */
    private createLegendTrace(
        legendName: string,
        legendGroup: string,
        hexColor: string,
        legendRank: number,
        yaxis: string,
        xaxis: string,
        includeMarkers = false
    ): Partial<TimeSeriesPlotData> {
        return {
            name: legendName,
            x: [null],
            y: [null],
            legendgroup: legendGroup,
            showlegend: true,
            visible: true,
            mode: includeMarkers ? "lines+markers" : "lines",
            line: { color: hexColor },
            marker: { color: hexColor },
            legendrank: legendRank,
            yaxis: yaxis,
            xaxis: xaxis,
        };
    }

    /**
     * Create graph legends
     *
     * Build "dummy" traces with empty x and y values for specific legend group, and add to top right subplot.
     * The legends for each added "dummy" trace will then be shown in the top right subplot.
     */
    private createGraphLegends(): void {
        let currentLegendRank = 1;

        // Place legends in top right subplot
        const numColumns = this._figure.getNumColumns();
        const topRightSubplotIndex = this._figure.getAxisIndex(1, numColumns);
        const xAxisTopRight = `xaxis${topRightSubplotIndex}`;
        const yAxisTopRight = `yaxis${topRightSubplotIndex}`;

        // Add legend for each vector/ensemble not colored by parameter
        if (this._addedEnsemblesLegendTracker.length !== 0 || this._addedVectorsLegendTracker.length !== 0) {
            // Add legend for each vector/ensemble on top
            if (this._subplotOwner === SubplotOwner.ENSEMBLE) {
                this._addedVectorsLegendTracker.forEach((vectorName) => {
                    const hexColor = this._vectorHexColors[vectorName] ?? this._traceFallbackColor;
                    this._figure.addTrace(
                        this.createLegendTrace(
                            vectorName,
                            vectorName,
                            hexColor,
                            currentLegendRank++,
                            yAxisTopRight,
                            xAxisTopRight
                        )
                    );
                });
            }
            if (this._subplotOwner === SubplotOwner.VECTOR) {
                this._addedEnsemblesLegendTracker.forEach((ensembleIdent) => {
                    const legendGroup = ensembleIdent.toString();
                    const legendName = this._makeEnsembleDisplayName(ensembleIdent);
                    const legendColor =
                        this._selectedVectorSpecifications.find((el) => el.ensembleIdent === ensembleIdent)?.color ??
                        this._traceFallbackColor;
                    this._figure.addTrace(
                        this.createLegendTrace(
                            legendName,
                            legendGroup,
                            legendColor,
                            currentLegendRank++,
                            xAxisTopRight,
                            yAxisTopRight
                        )
                    );
                });
            }
        }

        // Add legend for history trace with legendrank after vectors/ensembles
        if (this._hasHistoryTraces) {
            const historyName = "History";
            this._figure.addTrace(
                this.createLegendTrace(
                    historyName,
                    historyName,
                    this._historyVectorColor,
                    currentLegendRank++,
                    yAxisTopRight,
                    xAxisTopRight
                )
            );
        }

        // Add legend for observation trace with legendrank after vectors/ensembles and history
        if (this._hasObservationTraces) {
            const observationName = "Observation";
            const includeMarkers = true;
            this._figure.addTrace(
                this.createLegendTrace(
                    observationName,
                    observationName,
                    this._observationColor,
                    currentLegendRank++,
                    yAxisTopRight,
                    xAxisTopRight,
                    includeMarkers
                )
            );
        }

        // Add color scale for color by parameter below the legends
        if (this._hasRealizationsTracesColoredByParameter && this._ensemblesParameterColoring) {
            const colorScaleMarker: Partial<PlotMarker> = {
                ...this._ensemblesParameterColoring.getColorScale().getAsPlotlyColorScaleMarkerObject(),
                colorbar: {
                    title: "Range: " + this._ensemblesParameterColoring.getParameterDisplayName(),
                    titleside: "right",
                    ticks: "outside",
                    len: 0.75, // Note: If too many legends are added, this len might have to be reduced?
                },
            };
            const parameterColorLegendTrace: Partial<TimeSeriesPlotData> = {
                x: [null],
                y: [null],
                marker: colorScaleMarker,
                showlegend: false,
            };
            this._figure.addTrace(parameterColorLegendTrace);
        }
    }

    private getLegendGroupAndUpdateTracker(vectorSpecification: VectorSpec): string {
        // Subplot per vector, keep track of added ensembles
        // Subplot per ensemble, keep track of added vectors
        if (this._subplotOwner === SubplotOwner.VECTOR) {
            const ensembleIdent = vectorSpecification.ensembleIdent;
            if (!this._addedEnsemblesLegendTracker.some((elm) => elm.equals(ensembleIdent))) {
                this._addedEnsemblesLegendTracker.push(ensembleIdent);
            }
            return ensembleIdent.toString();
        } else if (this._subplotOwner === SubplotOwner.ENSEMBLE) {
            const vectorName = vectorSpecification.vectorName;
            if (!this._addedVectorsLegendTracker.includes(vectorName)) {
                this._addedVectorsLegendTracker.push(vectorName);
            }
            return vectorName;
        }
        return "";
    }

    private getHexColor(vectorSpecification: VectorSpec): string {
        if (this._subplotOwner === SubplotOwner.VECTOR) {
            const hexColor = vectorSpecification.color;
            return hexColor ?? this._traceFallbackColor;
        } else if (this._subplotOwner === SubplotOwner.ENSEMBLE) {
            return this._vectorHexColors[vectorSpecification.vectorName];
        }
        return this._traceFallbackColor;
    }

    private insertVectorNameAndUnitIntoMap(vectorName: string, unit: string): void {
        if (vectorName in this._vectorNameUnitMap) return;

        this._vectorNameUnitMap[vectorName] = unit;
    }

    private createVectorSubplotTitle(vectorName: string): string {
        const vectorDescription = simulationVectorDescription(vectorName);
        const unit = this._vectorNameUnitMap[vectorName];
        if (!unit) return vectorDescription;

        return `${vectorDescription} [${simulationUnitReformat(unit)}]`;
    }

    private makeTraceNameFromVectorSpecification(vectorSpecification: VectorSpec): string {
        return this._subplotOwner === SubplotOwner.ENSEMBLE
            ? vectorSpecification.vectorName
            : this._makeEnsembleDisplayName(vectorSpecification.ensembleIdent);
    }
}
