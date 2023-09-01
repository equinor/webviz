import { VectorHistoricalData_api, VectorRealizationData_api, VectorStatisticData_api } from "@api";
import { ColorSet } from "@lib/utils/ColorSet";
import { VectorSpec } from "@modules/SimulationTimeSeries/state";

import { filterBrightness, formatHex, parseHex } from "culori";
import { Annotations, Layout } from "plotly.js";

import { PlotFigureBuilderBase } from "./plotFigureBuilderBase";

import { scaleHexColorLightness } from "../ColorUtils/colors";
import {
    createHistoricalVectorTrace,
    createVectorFanchartTraces,
    createVectorRealizationTraces,
    createVectorStatisticsTraces,
} from "../PlotlyTraceUtils/createVectorTracesUtils";
import { TimeSeriesPlotData } from "../plotUtils";

export type EnsembleHexColors = { [ensembleName: string]: string };

/**
    Helper class to build layout and corresponding plot data for plotly figure
    with subplot per selected vector.

 */
export class VectorSubplotBuilder extends PlotFigureBuilderBase {
    private _selectedVectorSpecifications: VectorSpec[] = [];
    private _ensembleHexColors: EnsembleHexColors = {};
    private _plotData: Partial<TimeSeriesPlotData>[] = [];
    private _addedEnsembles: string[] = [];
    private _numberOfSubplots = 0;
    private _uniqueVectorNames: string[] = [];
    private _brighten = filterBrightness(1.3, "rgb");

    private _hasHistoryTraces = false;
    private _hasObservationTraces = false;
    private _historyVectorColor = "black";
    private _observationColor = "black";

    private _width = 0;
    private _height = 0;

    constructor(selectedVectorSpecifications: VectorSpec[], colorSet: ColorSet, width: number, height: number) {
        super();

        this._selectedVectorSpecifications = selectedVectorSpecifications;
        this._width = width;
        this._height = height;

        // Create map with color for each ensemble
        const _uniqueEnsembleNames = [
            ...new Set(selectedVectorSpecifications.map((vec) => vec.ensembleIdent.getEnsembleName())),
        ];
        _uniqueEnsembleNames.forEach((ensembleName, index) => {
            const color = index === 0 ? colorSet.getFirstColor() : colorSet.getNextColor();
            this._ensembleHexColors[ensembleName] = color;
        });

        this._uniqueVectorNames = [...new Set(selectedVectorSpecifications.map((vec) => vec.vectorName))];
        this._numberOfSubplots = this._uniqueVectorNames.length;

        // TODO:
        // - Add keep uirevision?
        // - Assign same color to ensemble independent of order in ensemble list?
    }

    // Create figure/data
    createPlotData(): Partial<TimeSeriesPlotData>[] {
        this.createGraphLegends();
        return this._plotData;
    }

    createPlotLayout(): Partial<Layout> {
        return {
            width: this._width,
            height: this._height,
            margin: { t: 0, r: 0, l: 40, b: 40 },
            grid: { rows: this._numberOfSubplots, columns: 1, pattern: "coupled" },
            annotations: this.subplotTitles(), // NOTE: Annotations only way to create subplot titles?
            // uirevision: "true", // NOTE: Only works if vector data is cached, as Plot might receive empty data on rerender
        };
    }

    subplotTitles(): Partial<Annotations>[] {
        // NOTE: Annotations only way to create subplot titles?
        // See: https://github.com/plotly/plotly.js/issues/2746
        const titles: Partial<Annotations>[] = [];
        this._uniqueVectorNames.forEach((vec, index) => {
            const yPosition = 1 - index / this._numberOfSubplots - 0.01;
            titles.push({
                xref: "paper",
                yref: "paper",
                x: 0.5,
                y: yPosition,
                xanchor: "center",
                yanchor: "bottom",
                text: vec,
                showarrow: false,
            });
        });

        return titles;
    }

    // Create legends
    createGraphLegends(): void {
        let currentLegendRank = 1;

        // Add legend for each ensemble on top
        this._addedEnsembles.forEach((ensembleName) => {
            const ensembleLegendTrace: Partial<TimeSeriesPlotData> = {
                name: ensembleName,
                x: [null],
                y: [null],
                legendgroup: ensembleName,
                showlegend: true,
                visible: true,
                mode: "lines",
                line: { color: this._ensembleHexColors[ensembleName] },
                legendrank: currentLegendRank++,
                yaxis: `y1`,
            };

            this._plotData.push(ensembleLegendTrace);
        });

        // Add legend for history trace with legendrank after vectors
        if (this._hasHistoryTraces) {
            const historyLegendTrace: Partial<TimeSeriesPlotData> = {
                name: "History",
                x: [null],
                y: [null],
                legendgroup: "History",
                showlegend: true,
                visible: true,
                mode: "lines",
                line: { color: this._historyVectorColor },
                legendrank: currentLegendRank++,
                yaxis: `y1`,
            };

            this._plotData.push(historyLegendTrace);
        }

        // Add legend for observation trace with legendrank after vectors and history
        if (this._hasObservationTraces) {
            const observationLegendTrace: Partial<TimeSeriesPlotData> = {
                name: "Observation",
                x: [null],
                y: [null],
                legendgroup: "Observation",
                showlegend: true,
                visible: true,
                mode: "lines+markers",
                marker: { color: this._observationColor },
                line: { color: this._observationColor },
                legendrank: currentLegendRank++,
                yaxis: `y1`,
            };

            this._plotData.push(observationLegendTrace);
        }
    }

    // Add traces
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
        const hoverTemplate = ""; // No template yet

        // Create traces for each vector
        selectedVectorsRealizationData.forEach((elm) => {
            const subplotIndex = this.getSubplotIndex(elm.vectorSpecification.vectorName);
            if (subplotIndex === -1) return;

            // Add ensemble name to set if not already added
            const ensembleName = elm.vectorSpecification.ensembleIdent.getEnsembleName();
            if (!this._addedEnsembles.includes(ensembleName)) {
                this._addedEnsembles.push(ensembleName);
            }

            let color = this._ensembleHexColors[ensembleName];
            if (useIncreasedBrightness) {
                // TODO:
                // - Determine which solution is best: filterBrightness from culori vs adjust l-channel for hsl

                // Filter brightness using filterBrightness
                // const rgbColor = parseHex(color);
                // color = formatHex(this._brighten(rgbColor)) ?? color;

                // Adjust l-channel for hsl
                color = scaleHexColorLightness(color, 1.3) ?? color;
            }

            const vectorRealizationTraces = createVectorRealizationTraces(
                elm.data,
                elm.vectorSpecification.ensembleIdent,
                color,
                ensembleName,
                hoverTemplate,
                addLegendForTraces,
                `y${subplotIndex + 1}`
            );

            this._plotData.push(...vectorRealizationTraces);
        });
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
        selectedVectorsStatisticData.forEach((elm) => {
            const subplotIndex = this.getSubplotIndex(elm.vectorSpecification.vectorName);
            if (subplotIndex === -1) return;

            // Add ensemble name to set if not already added
            const ensembleName = elm.vectorSpecification.ensembleIdent.getEnsembleName();
            if (!this._addedEnsembles.includes(ensembleName)) {
                this._addedEnsembles.push(ensembleName);
            }

            const vectorFanchartTraces = createVectorFanchartTraces(
                elm.data,
                this._ensembleHexColors[ensembleName],
                ensembleName,
                `y${subplotIndex + 1}`
            );

            this._plotData.push(...vectorFanchartTraces);
        });
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
        selectedVectorsStatisticData.forEach((elm) => {
            const subplotIndex = this.getSubplotIndex(elm.vectorSpecification.vectorName);
            if (subplotIndex === -1) return;

            // Add ensemble name to set if not already added
            const ensembleName = elm.vectorSpecification.ensembleIdent.getEnsembleName();
            if (!this._addedEnsembles.includes(ensembleName)) {
                this._addedEnsembles.push(ensembleName);
            }

            const vectorStatisticsTraces = createVectorStatisticsTraces(
                elm.data,
                this._ensembleHexColors[ensembleName],
                ensembleName,
                `y${subplotIndex + 1}`,
                lineWidth
            );

            this._plotData.push(...vectorStatisticsTraces);
        });
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
        selectedVectorsHistoricalData.forEach((elm) => {
            const subplotIndex = this.getSubplotIndex(elm.vectorSpecification.vectorName);
            if (subplotIndex === -1) return;

            this._hasHistoryTraces = true;
            const vectorHistoryTrace = createHistoricalVectorTrace(
                elm.data,
                this._historyVectorColor,
                `y${subplotIndex + 1}`
            );
            this._plotData.push(vectorHistoryTrace);
        });
    }

    addVectorObservations(): void {
        throw new Error("Method not implemented.");
    }

    private getSubplotIndex(vectorName: string): number {
        return this._uniqueVectorNames.findIndex((name) => name === vectorName);
    }

    // TODO: Remove here or in createVectorTracesUtils.ts?
    // private getLineShape(isRate: boolean): "linear" | "vh" {
    //     return isRate ? "vh" : "linear";
    // }
}
