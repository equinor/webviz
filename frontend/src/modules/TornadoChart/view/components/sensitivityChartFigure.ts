import type { PlotData } from "plotly.js";

import { makeSubplots, type Figure } from "@modules/_shared/Figure";
import type { SensitivityColorMap } from "@modules/_shared/sensitivityColors";

import type { SensitivityResponseDataset, SensitivityResponse } from "../../../_shared/SensitivityProcessing/types";
import type { SensitivityDataScaler } from "../utils/sensitivityDataScaler";
import {
    createHighBarTrace,
    createHighRealizationPointsTrace,
    createLowBarTrace,
    createLowRealizationPointsTrace,
} from "../utils/traceUtils";

export enum TraceGroup {
    LOW = "Low",
    HIGH = "High",
}

export type SelectedBar = {
    group: TraceGroup;
    index: number;
};

export class SensitivityChartFigure {
    private _figure: Figure;
    private _scaler: SensitivityDataScaler;

    private _sensitivityColorMap: SensitivityColorMap;
    private _selectedBar: SelectedBar | null;
    private _sensitivityResponses: SensitivityResponse[];
    private _responseName?: string;
    private _responseUnit?: string;
    private _referenceAverage: number;
    private _formatter: Intl.NumberFormat = Intl.NumberFormat("en", {
        notation: "compact",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    constructor(
        width: number,
        height: number,
        sensitivityResponseDataset: SensitivityResponseDataset,
        sensitivityDataScaler: SensitivityDataScaler,
        sensitivityColorMap: SensitivityColorMap,
        options: {
            selectedBar?: SelectedBar | null;
        },
    ) {
        this._figure = makeSubplots({
            numRows: 1,
            numCols: 1,
            width: width,
            height: height,
            sharedXAxes: false,
            sharedYAxes: false,
            horizontalSpacing: 0.2,
            margin: {
                t: 20,
                r: 20,
                b: 20,
                l: 200,
            },
            showGrid: true,
        });

        this._sensitivityResponses = sensitivityResponseDataset.sensitivityResponses;
        this._responseName = sensitivityResponseDataset.responseName;
        this._responseUnit = sensitivityResponseDataset.responseUnit;
        this._referenceAverage = sensitivityResponseDataset.referenceAverage;
        this._sensitivityColorMap = sensitivityColorMap;
        this._scaler = sensitivityDataScaler;
        this._selectedBar = options.selectedBar || null;
    }

    private _updateLayout() {
        const xAxisRange = this._scaler.calculateXAxisRange(this._sensitivityResponses);
        const referencePosition = this._scaler.getXAxisReferencePosition();

        this._figure.updateLayout({
            barmode: "overlay",
            uirevision: "do not touch",
            ["xaxis1"]: {
                title: {
                    text: `${this._responseName} (${this._responseUnit})`,
                    standoff: 40,
                },
                range: xAxisRange,
            },

            shapes: [
                {
                    type: "line",
                    line: { width: 3, color: "lightgrey" },
                    x0: referencePosition,
                    x1: referencePosition,
                    y0: 0,
                    y1: 1,
                    xref: "x",
                    yref: "paper",
                },
            ],
        } as any);
        this._figure.addAnnotation(
            {
                x: referencePosition,
                y: this._sensitivityResponses.length,
                xref: "x",
                yref: "paper",
                text: `<b>${this._formatter.format(this._referenceAverage)}</b> (Ref avg)`,
                showarrow: false,
                align: "center",
            },
            1,
            1,
        );
    }

    public buildBarTraces(showLabels: boolean, transparency = false) {
        this._figure.addTrace(this._createLowTrace(showLabels, transparency));
        this._figure.addTrace(this._createHighTrace(showLabels, transparency));
    }
    public buildRealizationTraces() {
        this._figure.addTrace(
            createHighRealizationPointsTrace(
                this._createHighRealizationsValues(),
                this._createHighRealizationsLabels(),
                this._sensitivityColorMap,
            ),
        );
        this._figure.addTrace(
            createLowRealizationPointsTrace(
                this._createLowRealizationsValues(),
                this._createLowRealizationsLabels(),
                this._sensitivityColorMap,
            ),
        );
    }

    private _calculateHighXValues() {
        return this._scaler.calculateHighXValues(this._sensitivityResponses);
    }
    private _calculateLowXValues() {
        return this._scaler.calculateLowXValues(this._sensitivityResponses);
    }
    private _createHighLabel(): string[] {
        return this._sensitivityResponses.map((s) => this._computeHighLabel(s));
    }
    private _createLowLabel(): string[] {
        return this._sensitivityResponses.map((s) => this._computeLowLabel(s));
    }
    private _createHighCustomData(): string[] {
        return this._sensitivityResponses.map((s) => s.highCaseName);
    }
    private _createLowCustomData(): string[] {
        return this._sensitivityResponses.map((s) => s.lowCaseName);
    }
    private _createSensitivityNames(): string[] {
        return this._sensitivityResponses.map((s) => s.sensitivityName);
    }
    private _createHighBase(): number[] {
        return this._scaler.createHighBase(this._sensitivityResponses);
    }
    private _createLowBase(): number[] {
        return this._scaler.createLowBase(this._sensitivityResponses);
    }
    private _createHighTrace(showLabels: boolean, transparency = false): Partial<PlotData> {
        return createHighBarTrace({
            xValues: this._calculateHighXValues(),
            yValues: this._createSensitivityNames(),
            customdata: this._createHighCustomData(),
            baseValues: this._createHighBase(),
            selectedBar: this._selectedBar,
            namedColorMap: this._sensitivityColorMap,
            label: showLabels ? this._createHighLabel() : undefined,
            transparency,
        });
    }

    private _createLowTrace(showLabels: boolean, transparency = false): Partial<PlotData> {
        return createLowBarTrace({
            xValues: this._calculateLowXValues(),
            yValues: this._createSensitivityNames(),
            customdata: this._createLowCustomData(),
            baseValues: this._createLowBase(),
            selectedBar: this._selectedBar,
            namedColorMap: this._sensitivityColorMap,
            label: showLabels ? this._createLowLabel() : undefined,
            transparency,
        });
    }

    private _createLowRealizationsValues(): number[] {
        return this._scaler.createLowRealizationsValues(this._sensitivityResponses);
    }
    private _createLowRealizationsLabels(): string[] {
        return this._sensitivityResponses.flatMap((s) => s.lowCaseRealizationValues.map(() => s.sensitivityName));
    }
    private _createHighRealizationsValues(): number[] {
        return this._scaler.createHighRealizationsValues(this._sensitivityResponses);
    }
    private _createHighRealizationsLabels(): string[] {
        return this._sensitivityResponses.flatMap((s) => s.highCaseRealizationValues.map(() => s.sensitivityName));
    }
    // Formatting utility methods
    private _numFormat(number: number): string {
        if (this._scaler.isRelativePercentage) {
            return `${this._formatter.format(number)}%`;
        }
        return this._formatter.format(number);
    }

    private _computeLowLabel(sensitivity: SensitivityResponse): string {
        const lowValue = this._scaler.calculateLowLabelValue(sensitivity);
        const highValue = this._scaler.calculateHighLabelValue(sensitivity);

        // Combine labels if they appear on the both side
        if (lowValue > 0 || highValue < 0) {
            return `${this._numFormat(lowValue)} | ${this._numFormat(highValue)}`;
        }
        return `${this._numFormat(lowValue)}`;
    }

    private _computeHighLabel(sensitivity: SensitivityResponse): string {
        const lowValue = this._scaler.calculateLowLabelValue(sensitivity);
        const highValue = this._scaler.calculateHighLabelValue(sensitivity);

        // Combine labels if they appear on the both side
        if (lowValue > 0 || highValue < 0) {
            return `${this._numFormat(lowValue)} | ${this._numFormat(highValue)}`;
        }
        return `${this._numFormat(highValue)}`;
    }

    makePlotData() {
        return this._figure.makeData() as any;
    }

    makePlotLayout() {
        this._updateLayout();
        return this._figure.makeLayout();
    }
}
