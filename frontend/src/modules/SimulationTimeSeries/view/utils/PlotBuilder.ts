import type React from "react";

import type { Annotations, PlotMarker, Shape } from "plotly.js";

import type {
    DerivedVectorInfo_api,
    Frequency_api,
    SummaryVectorObservations_api,
    VectorHistoricalData_api,
    VectorRealizationData_api,
    VectorStatisticData_api,
} from "@api";
import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import type { Figure } from "@modules/_shared/Figure";
import { CoordinateDomain, makeSubplots } from "@modules/_shared/Figure";
import { simulationUnitReformat, simulationVectorDescription } from "@modules/_shared/reservoirSimulationStringUtils";
import type { VectorHexColorMap, VectorSpec } from "@modules/SimulationTimeSeries/typesAndEnums";
import { FrequencyEnumToStringMapping, SubplotLimitDirection } from "@modules/SimulationTimeSeries/typesAndEnums";
import { createDerivedVectorDescription } from "@modules/SimulationTimeSeries/utils/vectorDescriptionUtils";

import { getHexColorFromOwner, scaleHexColorLightness } from "./colorUtils";
import type { EnsemblesContinuousParameterColoring } from "./ensemblesContinuousParameterColoring";
import {
    createHistoricalVectorTrace,
    createVectorFanchartTraces,
    createVectorObservationsTraces,
    createVectorRealizationTrace,
    createVectorRealizationTraces,
    createVectorStatisticsTraces,
    getTraceLineShape,
} from "./PlotlyTraceUtils/createVectorTracesUtils";
import type { TimeSeriesPlotData } from "./timeSeriesPlotData";

type VectorNameSubplotTitleMap = { [vectorName: string]: string };

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

    private _resampleFrequency: Frequency_api | null = null;

    private _addedVectorsLegendTracker: string[] = [];
    private _addedEnsemblesLegendTracker: (RegularEnsembleIdent | DeltaEnsembleIdent)[] = [];

    private _uniqueEnsembleIdents: (RegularEnsembleIdent | DeltaEnsembleIdent)[] = [];
    private _uniqueVectorNames: string[] = [];

    private _vectorToHexColorMap: VectorHexColorMap = {};

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

    private _vectorNameSubplotTitleMap: VectorNameSubplotTitleMap = {};

    private _timeAnnotationTimestamps: number[] = [];

    private _figure: Figure;
    private _numRows = 1;
    private _numCols = 1;

    private _limitDirection: SubplotLimitDirection = SubplotLimitDirection.NONE;
    private _limitDirectionMaxElements = 0;

    constructor(
        subplotOwner: SubplotOwner,
        selectedVectorSpecifications: VectorSpec[],
        resampleFrequency: Frequency_api | null,
        makeEnsembleDisplayName: (ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent) => string,
        vectorHexColorMap: VectorHexColorMap,
        width: number,
        height: number,
        ensemblesParameterColoring?: EnsemblesContinuousParameterColoring,
        limitDirection?: SubplotLimitDirection,
        limitDirectionMaxElements?: number,
        scatterType: "scatter" | "scattergl" = "scatter",
    ) {
        this._selectedVectorSpecifications = selectedVectorSpecifications;
        this._width = width;
        this._height = height;
        this._makeEnsembleDisplayName = makeEnsembleDisplayName;
        this._resampleFrequency = resampleFrequency;

        this._uniqueVectorNames = [...new Set(selectedVectorSpecifications.map((vec) => vec.vectorName))];
        this._uniqueEnsembleIdents = [];
        for (const vectorSpecification of selectedVectorSpecifications) {
            if (this._uniqueEnsembleIdents.some((elm) => elm.equals(vectorSpecification.ensembleIdent))) continue;
            this._uniqueEnsembleIdents.push(vectorSpecification.ensembleIdent);
        }
        this._vectorToHexColorMap = vectorHexColorMap;

        this._ensemblesParameterColoring = ensemblesParameterColoring ?? null;
        this._scatterType = scatterType;

        this._subplotOwner = subplotOwner;
        this._numberOfSubplots =
            subplotOwner === SubplotOwner.VECTOR ? this._uniqueVectorNames.length : this._uniqueEnsembleIdents.length;

        if (limitDirection && limitDirectionMaxElements === undefined) {
            throw new Error("limitDirectionMaxElements must be provided if limitDirection is provided");
        }
        this._limitDirection = limitDirection ?? SubplotLimitDirection.NONE;
        this._limitDirectionMaxElements = limitDirectionMaxElements ? Math.max(1, limitDirectionMaxElements) : 1;

        // Create figure
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
            margin: { t: 30, b: 40, l: 40, r: 40 },
            title: this._numberOfSubplots === 0 ? "Select vectors to visualize" : undefined,
            xAxisType: "date",
            showGrid: true,
            sharedXAxes: "all",
        });
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

    /**
     * Get index of subplot for vector specification
     *
     * The subplot index is 0-based.
     */
    private getSubplotIndexFromVectorSpec(vectorSpecification: VectorSpec) {
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

    /**
     * Create and set subplot titles after data is added
     *
     * The subplot titles are updated based on the vector name and unit provided in the vectorNameUnitMap.
     * The unit is provided after traces are added, thus the subplot titles are updated after traces are added.
     */
    private updateSubplotTitles(): void {
        if (this._subplotOwner === SubplotOwner.VECTOR) {
            this._uniqueVectorNames.forEach((vectorName, subplotIndex) => {
                const newSubplotTitle = this._vectorNameSubplotTitleMap[vectorName];
                const { row, col } = this.getSubplotRowAndColFromIndex(subplotIndex);
                if (!newSubplotTitle || !this._figure.hasSubplotTitle(row, col)) {
                    return;
                }

                this._figure.updateSubplotTitle(newSubplotTitle, row, col);
            });
        } else {
            this._uniqueEnsembleIdents.forEach((ensembleIdent, subplotIndex) => {
                const { row, col } = this.getSubplotRowAndColFromIndex(subplotIndex);
                if (!this._figure.hasSubplotTitle(row, col)) {
                    return;
                }
                const newSubplotTitle = `Ensemble: ${this._makeEnsembleDisplayName(ensembleIdent)}`;
                this._figure.updateSubplotTitle(newSubplotTitle, row, col);
            });
        }
    }

    build(handleOnClick?: ((event: Readonly<Plotly.PlotMouseEvent>) => void) | undefined): React.ReactNode {
        this.createGraphLegends();
        this.updateSubplotTitles();

        // Add time annotations and shapes
        for (let index = 0; index < this._numberOfSubplots; index++) {
            const { row, col } = this.getSubplotRowAndColFromIndex(index);
            for (const timeAnnotation of this.createTimeAnnotations()) {
                this._figure.addAnnotation(timeAnnotation, row, col, CoordinateDomain.DATA, CoordinateDomain.SCENE);
            }
            for (const timeShape of this.createTimeShapes()) {
                this._figure.addShape(timeShape, row, col, CoordinateDomain.DATA, CoordinateDomain.SCENE);
            }
        }

        return this._figure.makePlot({ onClick: handleOnClick });
    }

    addRealizationTracesColoredByParameter(
        vectorsRealizationData: { vectorSpecification: VectorSpec; data: VectorRealizationData_api[] }[],
    ): void {
        if (!this._ensemblesParameterColoring) {
            throw new Error(
                "EnsemblesParameterColoring is not defined. Must be provided in PlotBuilder constructor to add realization traces colored by parameter",
            );
        }

        // Only allow selected vectors
        const selectedVectorsRealizationData = vectorsRealizationData.filter((vec) =>
            this._selectedVectorSpecifications.some(
                (selectedVec) => selectedVec.vectorName === vec.vectorSpecification.vectorName,
            ),
        );

        const addLegendForTraces = false;

        // Create traces for each vector
        for (const elm of selectedVectorsRealizationData) {
            const subplotIndex = this.getSubplotIndexFromVectorSpec(elm.vectorSpecification);
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
                    realizationData.realization,
                );

                if (hasParameterForEnsemble && hasParameterValueForRealization) {
                    const value = this._ensemblesParameterColoring.getParameterRealizationValue(
                        ensembleIdent,
                        realizationData.realization,
                    );
                    parameterColor = this._ensemblesParameterColoring.getColorScale().getColorForValue(value);
                }

                const name = this.makeTraceNameFromVectorSpecification(elm.vectorSpecification);
                const lineShape = getTraceLineShape(realizationData);
                const vectorRealizationTrace = createVectorRealizationTrace({
                    vectorRealizationData: realizationData,
                    name: name,
                    color: parameterColor,
                    legendGroup: this._makeEnsembleDisplayName(elm.vectorSpecification.ensembleIdent),
                    lineShape: lineShape,
                    hoverTemplate: this._defaultHoverTemplate,
                    showLegend: addLegendForTraces,
                    type: this._scatterType,
                });

                const { row, col } = this.getSubplotRowAndColFromIndex(subplotIndex);
                this._figure.addTrace(vectorRealizationTrace, row, col);

                this._hasRealizationsTracesColoredByParameter = true;
                this.createVectorSubplotTitleAndInsertIntoMap(
                    elm.vectorSpecification.vectorName,
                    realizationData.unit,
                    realizationData.derivedVectorInfo,
                );
            }
        }
    }

    addRealizationsTraces(
        vectorsRealizationData: { vectorSpecification: VectorSpec; data: VectorRealizationData_api[] }[],
        useIncreasedBrightness: boolean,
    ): void {
        // Only allow selected vectors
        const selectedVectorsRealizationData = vectorsRealizationData.filter((vec) =>
            this._selectedVectorSpecifications.some(
                (selectedVec) => selectedVec.vectorName === vec.vectorSpecification.vectorName,
            ),
        );

        const addLegendForTraces = false;

        // Create traces for each vector
        for (const elm of selectedVectorsRealizationData) {
            const subplotIndex = this.getSubplotIndexFromVectorSpec(elm.vectorSpecification);
            if (subplotIndex === -1) continue;
            if (elm.data.length === 0) continue;

            // Get legend group and color
            const legendGroup = this.getLegendGroupAndUpdateTracker(elm.vectorSpecification);
            let color = getHexColorFromOwner(
                this._subplotOwner,
                elm.vectorSpecification,
                this._vectorToHexColorMap,
                this._traceFallbackColor,
            );
            if (useIncreasedBrightness) {
                color = scaleHexColorLightness(color, 1.3) ?? color;
            }

            const name = this.makeTraceNameFromVectorSpecification(elm.vectorSpecification);
            const lineShape = getTraceLineShape(elm.data[0]);
            const vectorRealizationTraces = createVectorRealizationTraces({
                vectorRealizationsData: elm.data,
                name: name,
                color: color,
                legendGroup: legendGroup,
                lineShape: lineShape,
                hoverTemplate: this._defaultHoverTemplate,
                showLegend: addLegendForTraces,
                type: this._scatterType,
            });

            const { row, col } = this.getSubplotRowAndColFromIndex(subplotIndex);
            this._figure.addTraces(vectorRealizationTraces, row, col);

            if (elm.data.length !== 0) {
                this.createVectorSubplotTitleAndInsertIntoMap(
                    elm.vectorSpecification.vectorName,
                    elm.data[0].unit,
                    elm.data[0].derivedVectorInfo,
                );
            }
        }
    }

    addFanchartTraces(
        vectorsStatisticData: { vectorSpecification: VectorSpec; data: VectorStatisticData_api }[],
    ): void {
        // Only allow selected vectors
        const selectedVectorsStatisticData = vectorsStatisticData.filter((vec) =>
            this._selectedVectorSpecifications.some(
                (selectedVec) => selectedVec.vectorName === vec.vectorSpecification.vectorName,
            ),
        );

        // Create traces for each vector
        for (const elm of selectedVectorsStatisticData) {
            const subplotIndex = this.getSubplotIndexFromVectorSpec(elm.vectorSpecification);
            if (subplotIndex === -1) continue;

            // Get legend group and color
            const legendGroup = this.getLegendGroupAndUpdateTracker(elm.vectorSpecification);
            const color = getHexColorFromOwner(
                this._subplotOwner,
                elm.vectorSpecification,
                this._vectorToHexColorMap,
                this._traceFallbackColor,
            );

            const name = this.makeTraceNameFromVectorSpecification(elm.vectorSpecification);
            const lineShape = getTraceLineShape(elm.data);
            const vectorFanchartTraces = createVectorFanchartTraces({
                vectorStatisticData: elm.data,
                hexColor: color,
                legendGroup: legendGroup,
                lineShape: lineShape,
                name: name,
                type: this._scatterType,
            });

            const { row, col } = this.getSubplotRowAndColFromIndex(subplotIndex);
            this._figure.addTraces(vectorFanchartTraces, row, col);

            this.createVectorSubplotTitleAndInsertIntoMap(
                elm.vectorSpecification.vectorName,
                elm.data.unit,
                elm.data.derivedVectorInfo,
            );
        }
    }

    addStatisticsTraces(
        vectorsStatisticData: { vectorSpecification: VectorSpec; data: VectorStatisticData_api }[],
        highlightStatisticTraces: boolean,
    ): void {
        // Only allow selected vectors
        const selectedVectorsStatisticData = vectorsStatisticData.filter((vec) =>
            this._selectedVectorSpecifications.some(
                (selectedVec) => selectedVec.vectorName === vec.vectorSpecification.vectorName,
            ),
        );

        const lineWidth = highlightStatisticTraces ? 3 : 2;

        // Create traces for each vector
        for (const elm of selectedVectorsStatisticData) {
            const subplotIndex = this.getSubplotIndexFromVectorSpec(elm.vectorSpecification);
            if (subplotIndex === -1) continue;

            // Get legend group and color
            const legendGroup = this.getLegendGroupAndUpdateTracker(elm.vectorSpecification);
            const color = getHexColorFromOwner(
                this._subplotOwner,
                elm.vectorSpecification,
                this._vectorToHexColorMap,
                this._traceFallbackColor,
            );

            const name = this.makeTraceNameFromVectorSpecification(elm.vectorSpecification);
            const lineShape = getTraceLineShape(elm.data);
            const vectorStatisticsTraces = createVectorStatisticsTraces({
                vectorStatisticData: elm.data,
                hexColor: color,
                legendGroup: legendGroup,
                lineShape: lineShape,
                name: name,
                lineWidth: lineWidth,
                type: this._scatterType,
            });

            const { row, col } = this.getSubplotRowAndColFromIndex(subplotIndex);
            this._figure.addTraces(vectorStatisticsTraces, row, col);

            this.createVectorSubplotTitleAndInsertIntoMap(
                elm.vectorSpecification.vectorName,
                elm.data.unit,
                elm.data.derivedVectorInfo,
            );
        }
    }

    addHistoryTraces(
        vectorsHistoricalData: {
            vectorSpecification: VectorSpec;
            data: VectorHistoricalData_api;
        }[],
    ): void {
        // Only allow selected vectors
        const selectedVectorsHistoricalData = vectorsHistoricalData.filter((vec) =>
            this._selectedVectorSpecifications.some(
                (selectedVec) => selectedVec.vectorName === vec.vectorSpecification.vectorName,
            ),
        );

        // Create traces for each vector
        for (const elm of selectedVectorsHistoricalData) {
            const subplotIndex = this.getSubplotIndexFromVectorSpec(elm.vectorSpecification);
            if (subplotIndex === -1) continue;

            const name = this.makeTraceNameFromVectorSpecification(elm.vectorSpecification);
            const lineShape = getTraceLineShape(elm.data);
            const vectorHistoryTrace = createHistoricalVectorTrace({
                vectorHistoricalData: elm.data,
                name: name,
                color: this._historyVectorColor,
                type: this._scatterType,
                lineShape: lineShape,
            });

            const { row, col } = this.getSubplotRowAndColFromIndex(subplotIndex);
            this._figure.addTrace(vectorHistoryTrace, row, col);

            this._hasHistoryTraces = true;
            this.createVectorSubplotTitleAndInsertIntoMap(elm.vectorSpecification.vectorName, elm.data.unit);
        }
    }

    addObservationsTraces(
        vectorsObservationData: {
            vectorSpecification: VectorSpec;
            data: SummaryVectorObservations_api;
        }[],
    ): void {
        // Only allow selected vectors
        const selectedVectorsObservationData = vectorsObservationData.filter((vec) =>
            this._selectedVectorSpecifications.some(
                (selectedVec) => selectedVec.vectorName === vec.vectorSpecification.vectorName,
            ),
        );

        // Create traces for each vector
        for (const elm of selectedVectorsObservationData) {
            const subplotIndex = this.getSubplotIndexFromVectorSpec(elm.vectorSpecification);
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
        includeMarkers = false,
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
                    const hexColor = this._vectorToHexColorMap[vectorName] ?? this._traceFallbackColor;
                    this._figure.addTrace(
                        this.createLegendTrace(
                            vectorName,
                            vectorName,
                            hexColor,
                            currentLegendRank++,
                            yAxisTopRight,
                            xAxisTopRight,
                        ),
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
                            yAxisTopRight,
                        ),
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
                    xAxisTopRight,
                ),
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
                    includeMarkers,
                ),
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

    private createVectorSubplotTitleAndInsertIntoMap(
        vectorName: string,
        unit: string,
        derivedVectorInfo?: DerivedVectorInfo_api | null,
    ): void {
        if (vectorName in this._vectorNameSubplotTitleMap) return;

        const vectorDescription = this.createVectorDescription(vectorName, derivedVectorInfo);
        const unitText = unit.length === 0 ? "" : ` [${simulationUnitReformat(unit)}]`;

        this._vectorNameSubplotTitleMap[vectorName] = `${vectorDescription}${unitText}`;
    }

    private createVectorDescription(vectorName: string, derivedVectorInfo?: DerivedVectorInfo_api | null): string {
        if (derivedVectorInfo) {
            const derivedVectorDescription = createDerivedVectorDescription(
                derivedVectorInfo.sourceVector,
                derivedVectorInfo.type,
            );
            if (this._resampleFrequency) {
                const frequencyString = FrequencyEnumToStringMapping[this._resampleFrequency];
                return `${frequencyString} ${derivedVectorDescription}`;
            }
            return derivedVectorDescription;
        }

        return simulationVectorDescription(vectorName);
    }

    private makeTraceNameFromVectorSpecification(vectorSpecification: VectorSpec): string {
        return this._subplotOwner === SubplotOwner.ENSEMBLE
            ? vectorSpecification.vectorName
            : this._makeEnsembleDisplayName(vectorSpecification.ensembleIdent);
    }
}
