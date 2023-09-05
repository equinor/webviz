import { VectorHistoricalData_api, VectorRealizationData_api, VectorStatisticData_api } from "@api";
import { ColorSet } from "@lib/utils/ColorSet";

// import { filterBrightness, formatHex, parseHex } from "culori";
import { Annotations, Layout } from "plotly.js";

import {
    createHistoricalVectorTrace,
    createVectorFanchartTraces,
    createVectorRealizationTraces,
    createVectorStatisticsTraces,
} from "./PlotlyTraceUtils/createVectorTracesUtils";
import { scaleHexColorLightness } from "./colorUtils";
import { TimeSeriesPlotData } from "./timeSeriesPlotData";

import { VectorSpec } from "../state";

export type HexColorMap = { [name: string]: string };

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
    private _addedEnsemblesLegendTracker: string[] = [];

    private _uniqueEnsembleNames: string[] = [];
    private _uniqueVectorNames: string[] = [];

    private _ensembleHexColors: HexColorMap = {};
    private _vectorHexColors: HexColorMap = {};
    // private _brighten = filterBrightness(1.3, "rgb");

    private _hasHistoryTraces = false;
    private _hasObservationTraces = false;
    private _historyVectorColor = "black";
    private _observationColor = "black";

    private _width = 0;
    private _height = 0;

    constructor(
        subplotOwner: SubplotOwner,
        selectedVectorSpecifications: VectorSpec[],
        colorSet: ColorSet,
        width: number,
        height: number
    ) {
        this._selectedVectorSpecifications = selectedVectorSpecifications;
        this._width = width;
        this._height = height;

        this._uniqueVectorNames = [...new Set(selectedVectorSpecifications.map((vec) => vec.vectorName))];
        this._uniqueEnsembleNames = [
            ...new Set(selectedVectorSpecifications.map((vec) => vec.ensembleIdent.getEnsembleName())),
        ];

        // Create map with color for each vector and ensemble
        this._uniqueVectorNames.forEach((vectorName, index) => {
            const color = index === 0 ? colorSet.getFirstColor() : colorSet.getNextColor();
            this._vectorHexColors[vectorName] = color;
        });
        this._uniqueEnsembleNames.forEach((ensembleName, index) => {
            const color = index === 0 ? colorSet.getFirstColor() : colorSet.getNextColor();
            this._ensembleHexColors[ensembleName] = color;
        });

        this._subplotOwner = subplotOwner;
        this._numberOfSubplots =
            this._subplotOwner === SubplotOwner.VECTOR
                ? this._uniqueVectorNames.length
                : this._uniqueEnsembleNames.length;

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
            annotations: this.subplotTitles(),
            // uirevision: "true", // NOTE: Only works if vector data is cached, as Plot might receive empty data on rerender
        };
    }

    subplotTitles(): Partial<Annotations>[] {
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
                titles.push(titleAnnotation(`Vector: "${vec}"`, yPosition));
            });
        } else if (this._subplotOwner === SubplotOwner.ENSEMBLE) {
            this._uniqueEnsembleNames.forEach((ens, index) => {
                const yPosition = 1 - index / this._numberOfSubplots - 0.01;
                titles.push(titleAnnotation(`Ensemble: "${ens}"`, yPosition));
            });
        }
        return titles;
    }

    // Create legends
    createGraphLegends(): void {
        let currentLegendRank = 1;

        // Helper function to create legend trace
        const subplotDataLegendTrace = (name: string, hexColor: string): Partial<TimeSeriesPlotData> => {
            return {
                name: name,
                x: [null],
                y: [null],
                legendgroup: name,
                showlegend: true,
                visible: true,
                mode: "lines",
                line: { color: hexColor },
                legendrank: currentLegendRank++,
                yaxis: `y1`,
            };
        };

        // Add legend for each vector/ensemble on top
        if (this._subplotOwner === SubplotOwner.ENSEMBLE) {
            this._addedVectorsLegendTracker.forEach((vectorName) => {
                this._plotData.push(subplotDataLegendTrace(vectorName, this._vectorHexColors[vectorName]));
            });
        } else if (this._subplotOwner === SubplotOwner.VECTOR) {
            this._addedEnsemblesLegendTracker.forEach((ensembleName) => {
                this._plotData.push(subplotDataLegendTrace(ensembleName, this._ensembleHexColors[ensembleName]));
            });
        }

        // Add legend for history trace with legendrank after vectors/ensembles
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

        // Add legend for observation trace with legendrank after vectors/ensembles and history
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
            const subplotIndex = this.getSubplotIndex(elm.vectorSpecification);
            if (subplotIndex === -1) return;

            // Get legend group and color
            const legendGroup = this.getLegendGroupAndUpdateTracker(elm.vectorSpecification);
            let color = this.getHexColor(elm.vectorSpecification);
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
                elm.vectorSpecification.ensembleIdent.getEnsembleName(),
                color,
                legendGroup,
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
            const subplotIndex = this.getSubplotIndex(elm.vectorSpecification);
            if (subplotIndex === -1) return;

            // Get legend group and color
            const legendGroup = this.getLegendGroupAndUpdateTracker(elm.vectorSpecification);
            const color = this.getHexColor(elm.vectorSpecification);

            const vectorFanchartTraces = createVectorFanchartTraces(
                elm.data,
                color,
                legendGroup,
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
            const subplotIndex = this.getSubplotIndex(elm.vectorSpecification);
            if (subplotIndex === -1) return;

            // Get legend group and color
            const legendGroup = this.getLegendGroupAndUpdateTracker(elm.vectorSpecification);
            const color = this.getHexColor(elm.vectorSpecification);

            const vectorStatisticsTraces = createVectorStatisticsTraces(
                elm.data,
                color,
                legendGroup,
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
            const subplotIndex = this.getSubplotIndex(elm.vectorSpecification);
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

    private getSubplotIndex(vectorSpecification: VectorSpec) {
        if (this._subplotOwner === SubplotOwner.VECTOR) {
            return this._uniqueVectorNames.indexOf(vectorSpecification.vectorName);
        } else if (this._subplotOwner === SubplotOwner.ENSEMBLE) {
            return this._uniqueEnsembleNames.indexOf(vectorSpecification.ensembleIdent.getEnsembleName());
        }
        return -1;
    }

    private getLegendGroupAndUpdateTracker(vectorSpecification: VectorSpec): string {
        // Subplot per vector, keep track of added ensembles
        // Subplot per ensemble, keep track of added vectors
        if (this._subplotOwner === SubplotOwner.VECTOR) {
            const ensembleName = vectorSpecification.ensembleIdent.getEnsembleName();
            if (!this._addedEnsemblesLegendTracker.includes(ensembleName)) {
                this._addedEnsemblesLegendTracker.push(ensembleName);
            }
            return ensembleName;
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
        // Subplot per vector implies individual color per ensemble
        // Subplot per ensemble implies individual color per vector
        if (this._subplotOwner === SubplotOwner.VECTOR) {
            return this._ensembleHexColors[vectorSpecification.ensembleIdent.getEnsembleName()];
        } else if (this._subplotOwner === SubplotOwner.ENSEMBLE) {
            return this._vectorHexColors[vectorSpecification.vectorName];
        }

        // Black hex as fallback
        return "#000000";
    }
}
