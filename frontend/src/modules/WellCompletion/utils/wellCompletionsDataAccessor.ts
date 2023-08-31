import {
    WellCompletionDataSet_api,
    WellCompletionData_api,
    WellCompletionUnits_api,
    WellCompletionWell_api,
    WellCompletionZone_api,
} from "@api";
import { CompletionPlotData, PlotData, WellPlotData } from "@webviz/well-completions-plot";

import { getRegexPredicate } from "./stringUtils";

/**
 * Util methods for providing data result based on selected time aggregation
 */
export enum TimeAggregationType {
    None = "None",
    Max = "Max",
    Average = "Average",
}

export const TimeAggregationTypeFunction = {
    [TimeAggregationType.None]: (arr: number[]): number => arr[arr.length - 1],
    [TimeAggregationType.Max]: (arr: number[]): number => Math.max(...arr),
    [TimeAggregationType.Average]: (arr: number[]): number => arr.reduce((a, b) => a + b) / arr.length,
};

export class WellCompletionsDataAccessor {
    /**
     * This class is responsible for parsing and providing data for the well completions plot.
     *
     * It parses data structure received from backend and creates the data structure needed for the plot
     * in WellCompletionsPlot-component.
     *
     * The data is parsed from the WellCompletionData_api object and methods are taken from the
     * WellCompletions-component of webviz-subsurface-components package, and modified to fit.
     */
    private _dataSet: WellCompletionDataSet_api | null;
    private _subzones: WellCompletionZone_api[];
    private _wells: WellCompletionWell_api[];
    private _searchWellText: string;
    private _hideZeroCompletions: boolean;

    constructor() {
        this._dataSet = null;
        this._subzones = [];
        this._wells = [];
        this._searchWellText = "";
        this._hideZeroCompletions = false;
    }

    clearWellCompletionsData(): void {
        // Do not clear search text and hide zero completions

        this._dataSet = null;
        this._subzones = [];
        this._wells = [];
    }

    parseWellCompletionsData(data: WellCompletionData_api): void {
        // TODO:
        // - Filter wells when filter functionality is in place
        // - Filter subzones when filter functionality is in place

        this._dataSet = data.json_data;
        this._wells = this._dataSet.wells;

        // Exctract all subzones
        this._subzones = [];
        this._dataSet.stratigraphy.forEach((zone) => this.findSubzones(zone, this._subzones));
    }

    setSearchWellText(searchWell: string): void {
        this._searchWellText = searchWell;
    }

    setHideZeroCompletions(hideZeroCompletions: boolean): void {
        this._hideZeroCompletions = hideZeroCompletions;
    }

    getTimeSteps(): string[] {
        if (!this._dataSet) return [];
        return this._dataSet.timeSteps;
    }

    createPlotData(
        timeStepSelection: string | [string, string],
        timeAggregation: TimeAggregationType
    ): PlotData | null {
        // TODO: Consider removing function arguments, and use setter-methods for each argument and set to an attribute.
        //       This would make it easier to modify/adjust single attributes and call "createPlotData" again.
        if (!this._dataSet) return null;

        let timeStepIndexRange: [number, number] | null = null;
        if (typeof timeStepSelection === "string") {
            const timeStepIndex = this._dataSet.timeSteps.indexOf(timeStepSelection);
            timeStepIndexRange = [timeStepIndex, timeStepIndex];
        } else {
            timeStepIndexRange = [
                this._dataSet.timeSteps.indexOf(timeStepSelection[0]),
                this._dataSet.timeSteps.indexOf(timeStepSelection[1]),
            ];
        }
        if (timeStepIndexRange[0] === -1 || timeStepIndexRange[1] === -1) return null;

        // Filter wells based on search text
        // TODO: Add filtering of attributes as well
        const wellNameRegex = getRegexPredicate(this._searchWellText);
        const filteredWells = this._searchWellText
            ? Array.from(this._wells as WellCompletionWell_api[]).filter((well) => wellNameRegex(well.name))
            : this._wells;

        return this.computePlotData(
            this._subzones,
            filteredWells,
            timeStepIndexRange,
            timeAggregation,
            this._hideZeroCompletions,
            this._dataSet?.units
        );
    }

    private findEarliestCompletionDateIndices(
        well: WellCompletionWell_api,
        subzones: WellCompletionZone_api[]
    ): number {
        let earliestCompDateIndex = Number.POSITIVE_INFINITY;
        subzones.forEach((zone) => {
            if (zone.name in well.completions) {
                const completion = well.completions[zone.name];
                //Find the earliest date for the given completion
                const earliestDate = completion.t.find((_, index) => completion.open[index] > 0);
                if (earliestDate !== undefined) earliestCompDateIndex = Math.min(earliestCompDateIndex, earliestDate);
            }
        });

        return earliestCompDateIndex;
    }

    private computePlotData(
        subzones: WellCompletionZone_api[],
        wells: WellCompletionWell_api[],
        range: [number, number],
        timeAggregation: TimeAggregationType,
        hideZeroCompletions: boolean,
        units: WellCompletionUnits_api
    ): PlotData {
        const wellPlotData: WellPlotData[] = [];
        wells.forEach((well) => {
            const completionsPlotData: CompletionPlotData[] = [];
            const earliestCompDateIndex = this.findEarliestCompletionDateIndices(well, subzones);
            let hasData = false;
            subzones.forEach((zoneName, zoneIndex) => {
                const length = range[1] - range[0] + 1;
                const openValues = Array(length).fill(0);
                const shutValues = Array(length).fill(0);
                const khMeanValues = Array(length).fill(0);
                const khMinValues = Array(length).fill(0);
                const khMaxValues = Array(length).fill(0);
                if (zoneName.name in well.completions) {
                    const completion = well.completions[zoneName.name];
                    //Find values in the time range
                    let index = 0;
                    let currentOpenValue = 0;
                    let currentShutValue = 0;
                    let currentkhMeanValue = 0;
                    let currentkhMinValue = 0;
                    let currentkhMaxValue = 0;
                    for (let rangeI = 0; rangeI < length; rangeI++) {
                        const timeStep = rangeI + range[0];
                        while (timeStep >= completion.t[index]) {
                            currentOpenValue = completion.open[index];
                            currentShutValue = completion.shut[index];
                            currentkhMeanValue = completion.kh_mean[index];
                            currentkhMinValue = completion.kh_min[index];
                            currentkhMaxValue = completion.kh_max[index];
                            index++;
                        }
                        openValues[rangeI] = currentOpenValue;
                        shutValues[rangeI] = currentShutValue;
                        khMeanValues[rangeI] = currentkhMeanValue;
                        khMinValues[rangeI] = currentkhMinValue;
                        khMaxValues[rangeI] = currentkhMaxValue;
                    }
                }
                const dFunction = TimeAggregationTypeFunction[timeAggregation];
                const newCompletion = {
                    zoneIndex,
                    open: dFunction(openValues),
                    shut: dFunction(shutValues),
                    khMean: dFunction(khMeanValues),
                    khMin: dFunction(khMinValues),
                    khMax: dFunction(khMaxValues),
                };
                if (newCompletion.open !== 0) hasData = true;
                //If value changed
                if (
                    completionsPlotData.length === 0 ||
                    !this.isCompletionValuesEqual(completionsPlotData[completionsPlotData.length - 1], newCompletion)
                ) {
                    completionsPlotData.push(newCompletion);
                }
            });
            if (!hideZeroCompletions || hasData)
                wellPlotData.push({
                    ...well,
                    completions: completionsPlotData,
                    earliestCompDateIndex: earliestCompDateIndex,
                });
        });
        return {
            stratigraphy: subzones,
            wells: wellPlotData,
            units: units,
        };
    }

    private isCompletionValuesEqual = (completion1: CompletionPlotData, completion2: CompletionPlotData) =>
        completion1.open === completion2.open &&
        completion1.shut === completion2.shut &&
        completion1.khMean === completion2.khMean &&
        completion1.khMin === completion2.khMin &&
        completion1.khMax === completion2.khMax;

    private findSubzones = (zone: WellCompletionZone_api, result: WellCompletionZone_api[]): void => {
        // Depth-first search to find all leaf nodes
        if (zone === undefined) return;
        if (!zone.subzones || zone.subzones.length === 0) result.push(zone);
        else zone.subzones.forEach((zoneName) => this.findSubzones(zoneName, result));
    };
}
