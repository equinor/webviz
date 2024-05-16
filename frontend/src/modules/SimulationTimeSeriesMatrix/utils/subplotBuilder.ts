import {
    SummaryVectorObservations_api,
    VectorHistoricalData_api,
    VectorRealizationData_api,
    VectorStatisticData_api,
} from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import { ColorSet } from "@lib/utils/ColorSet";
import { simulationUnitReformat, simulationVectorDescription } from "@modules/_shared/reservoirSimulationStringUtils";

import { PlotMarker } from "plotly.js";
import { Annotations, Layout, Shape } from "plotly.js";

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

import { VectorSpec } from "../state";

type VectorNameUnitMap = { [vectorName: string]: string };
type HexColorMap = { [key: string]: string };
export enum SubplotOwner {
    VECTOR = "Vector",
    ENSEMBLE = "Ensemble",
}

/**
    Helper class to build layout and corresponding plot data for plotly figure
    with subplot per selected vector or per selected ensemble according to grouping selection.

 */
export class SubplotBuilder {
    private _selectedVectorSpecifications: VectorSpec[] = [];
    private _plotData: Partial<TimeSeriesPlotData>[] = [];
    private _numberOfSubplots = 0;
    private _subplotOwner: SubplotOwner;

    private _addedVectorsLegendTracker: string[] = [];
    private _addedEnsemblesLegendTracker: EnsembleIdent[] = [];

    private _uniqueEnsembleIdents: EnsembleIdent[] = [];
    private _uniqueVectorNames: string[] = [];

    private _vectorHexColors: HexColorMap = {};

    private _makeEnsembleDisplayName: (ensembleIdent: EnsembleIdent) => string;

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

    constructor(
        subplotOwner: SubplotOwner,
        selectedVectorSpecifications: VectorSpec[],
        makeEnsembleDisplayName: (ensembleIdent: EnsembleIdent) => string,
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

        this._subplotOwner = subplotOwner;
        this._numberOfSubplots =
            this._subplotOwner === SubplotOwner.VECTOR
                ? this._uniqueVectorNames.length
                : this._uniqueEnsembleIdents.length;

        this._ensemblesParameterColoring = ensemblesParameterColoring ?? null;
        this._scatterType = scatterType;

        // TODO:
        // - Handle keep uirevision?
        // - Assign same color to vector independent of order in vector list?
        // - Determine which color brightness method to utilize
    }

    createPlotData(): Partial<TimeSeriesPlotData>[] {
        this.createGraphLegends();
        return this._plotData;
    }

    createPlotLayout(): Partial<Layout> {
        // NOTE:
        // - Should one add xaxis: { type: "date" }, xaxis2: { type: "date" }, etc.? One for each xaxis? Seems to work with only xaxis: { type: "date" }
        // - Annotations only way to create subplot titles?
        return {
            width: this._width,
            height: this._height,
            margin: { t: 30, r: 0, l: 40, b: 40 },
            xaxis: { type: "date" },
            grid: { rows: this._numberOfSubplots, columns: 1, pattern: "coupled" },
            annotations: [...this.createSubplotTitles(), ...this.createTimeAnnotations()],
            shapes: this.createTimeShapes(),
            title: this.createSubplotTitles().length === 0 ? "Select a vector to visualize" : undefined,
            // uirevision: "true", // NOTE: Only works if vector data is cached, as Plot might receive empty data on rerender
        };
    }

    private createSubplotTitles(): Partial<Annotations>[] {
        // NOTE: Annotations only way to create subplot titles?
        // See: https://github.com/plotly/plotly.js/issues/2746
        const titles: Partial<Annotations>[] = [];

        const titleAnnotation = (title: string, yPosition: number): Partial<Annotations> => {
            return {
                xref: "paper",
                yref: "paper",
                x: 0.5,
                y: yPosition,
                xanchor: "center",
                yanchor: "bottom",
                text: title,
                showarrow: false,
            };
        };

        if (this._subplotOwner === SubplotOwner.VECTOR) {
            this._uniqueVectorNames.forEach((vec, index) => {
                const yPosition = 1 - index / this._numberOfSubplots - 0.01;
                const vectorTitle = this.createVectorSubplotTitle(vec);
                titles.push(titleAnnotation(vectorTitle, yPosition));
            });
        } else if (this._subplotOwner === SubplotOwner.ENSEMBLE) {
            this._uniqueEnsembleIdents.forEach((ensembleIdent, index) => {
                const yPosition = 1 - index / this._numberOfSubplots - 0.01;
                const ensembleTitle = `Ensemble: ${this._makeEnsembleDisplayName(ensembleIdent)}`;
                titles.push(titleAnnotation(ensembleTitle, yPosition));
            });
        }
        return titles;
    }

    // Helper function to create legend trace
    private createLegendTrace(
        legendName: string,
        legendGroup: string,
        hexColor: string,
        legendRank: number,
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
            yaxis: `y1`,
        };
    }

    // Create legends
    createGraphLegends(): void {
        let currentLegendRank = 1;

        // Add legend for each vector/ensemble not colored by parameter
        if (this._addedEnsemblesLegendTracker.length !== 0 || this._addedVectorsLegendTracker.length !== 0) {
            // Add legend for each vector/ensemble on top
            if (this._subplotOwner === SubplotOwner.ENSEMBLE) {
                this._addedVectorsLegendTracker.forEach((vectorName) => {
                    const hexColor = this._vectorHexColors[vectorName] ?? this._traceFallbackColor;
                    this._plotData.push(this.createLegendTrace(vectorName, vectorName, hexColor, currentLegendRank++));
                });
            } else if (this._subplotOwner === SubplotOwner.VECTOR) {
                this._addedEnsemblesLegendTracker.forEach((ensembleIdent) => {
                    const legendGroup = ensembleIdent.toString();
                    const legendName = this._makeEnsembleDisplayName(ensembleIdent);
                    const legendColor =
                        this._selectedVectorSpecifications.find((el) => el.ensembleIdent === ensembleIdent)?.color ??
                        this._traceFallbackColor;
                    this._plotData.push(
                        this.createLegendTrace(legendName, legendGroup, legendColor, currentLegendRank++)
                    );
                });
            }
        }

        // Add legend for history trace with legendrank after vectors/ensembles
        if (this._hasHistoryTraces) {
            const historyName = "History";
            this._plotData.push(
                this.createLegendTrace(historyName, historyName, this._historyVectorColor, currentLegendRank++)
            );
        }

        // Add legend for observation trace with legendrank after vectors/ensembles and history
        if (this._hasObservationTraces) {
            const observationName = "Observation";
            const includeMarkers = true;
            this._plotData.push(
                this.createLegendTrace(
                    observationName,
                    observationName,
                    this._observationColor,
                    currentLegendRank++,
                    includeMarkers
                )
            );
        }

        // Add color scale for color by parameter below the legends
        if (this._hasRealizationsTracesColoredByParameter && this._ensemblesParameterColoring !== null) {
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
            this._plotData.push(parameterColorLegendTrace);
        }
    }

    addRealizationTracesColoredByParameter(
        vectorsRealizationData: { vectorSpecification: VectorSpec; data: VectorRealizationData_api[] }[]
    ): void {
        if (this._ensemblesParameterColoring === null) return;

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
                this._plotData.push(vectorRealizationTrace);
                this._hasRealizationsTracesColoredByParameter = true;
                this.insertIntoVectorNameUnitMap(elm.vectorSpecification.vectorName, realizationData.unit);
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
                yaxis: `y${subplotIndex + 1}`,
                type: this._scatterType,
            });

            this._plotData.push(...vectorRealizationTraces);

            if (elm.data.length !== 0) {
                this.insertIntoVectorNameUnitMap(elm.vectorSpecification.vectorName, elm.data[0].unit);
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

            this._plotData.push(...vectorFanchartTraces);
            this.insertIntoVectorNameUnitMap(elm.vectorSpecification.vectorName, elm.data.unit);
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
                yaxis: `y${subplotIndex + 1}`,
                lineWidth: lineWidth,
                type: this._scatterType,
            });

            this._plotData.push(...vectorStatisticsTraces);
            this.insertIntoVectorNameUnitMap(elm.vectorSpecification.vectorName, elm.data.unit);
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
                yaxis: `y${subplotIndex + 1}`,
                type: this._scatterType,
            });
            this._plotData.push(vectorHistoryTrace);
            this._hasHistoryTraces = true;
            this.insertIntoVectorNameUnitMap(elm.vectorSpecification.vectorName, elm.data.unit);
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
                yaxis: `y${subplotIndex + 1}`,
            });

            this._plotData.push(...vectorObservationsTraces);
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
                xref: "x",
                yref: "paper",
                x: timestampUtcMs,
                y: 0 - 22 / this._height,
                text: timestampUtcMsToCompactIsoString(timestampUtcMs),
                showarrow: false,
                arrowhead: 0,
                bgcolor: "rgba(255, 255, 255, 1)",
                bordercolor: "rgba(255, 0, 0, 1)",
                borderwidth: 2,
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
                xref: "x",
                yref: "paper",
                x0: timestampUtcMs,
                y0: 0,
                x1: timestampUtcMs,
                y1: 1,
                line: {
                    color: "red",
                    width: 3,
                    dash: "dot",
                },
            });
        }

        return timeShapes;
    }

    private getSubplotIndex(vectorSpecification: VectorSpec) {
        if (this._subplotOwner === SubplotOwner.VECTOR) {
            return this._uniqueVectorNames.indexOf(vectorSpecification.vectorName);
        } else if (this._subplotOwner === SubplotOwner.ENSEMBLE) {
            return this._uniqueEnsembleIdents.findIndex((elm) => elm.equals(vectorSpecification.ensembleIdent));
        }
        return -1;
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

    private insertIntoVectorNameUnitMap(vectorName: string, unit: string): void {
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
