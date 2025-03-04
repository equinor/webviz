import type {
    WellCompletionsData_api,
    WellCompletionsUnits_api,
    WellCompletionsWell_api,
    WellCompletionsZone_api,
} from "@api";
import type { ColorSet } from "@lib/utils/ColorSet";
import type {
    CompletionPlotData,
    PlotData,
    WellPlotData,
    Zone} from "@webviz/well-completions-plot";
import {
    SortDirection,
    SortWellsBy,
    areCompletionsPlotDataValuesEqual,
    createSortedWells,
    createSortedWellsFromSequence,
    createWellNameRegexMatcher,
} from "@webviz/well-completions-plot";

import { TimeAggregationSelection } from "../typesAndEnums";

/**
 * Util methods for providing data result based on selected time aggregation
 */
export const TimeAggregationTypeFunction = {
    [TimeAggregationSelection.NONE]: (arr: number[]): number => arr[arr.length - 1],
    [TimeAggregationSelection.MAX]: (arr: number[]): number => Math.max(...arr),
    [TimeAggregationSelection.AVERAGE]: (arr: number[]): number => arr.reduce((a, b) => a + b) / arr.length,
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
    private _data: WellCompletionsData_api | null;
    private _subzones: Zone[];
    private _wells: WellCompletionsWell_api[];
    private _sortedCompletionDates: string[];
    private _excludeWellText: string;
    private _searchWellText: string;
    private _sortWellsBy: SortWellsBy | null;
    private _sortDirection: SortDirection;
    private _hideZeroCompletions: boolean;

    constructor(data: WellCompletionsData_api, stratigraphyColorSet: ColorSet) {
        // TODO:
        // - Filter subzones when filter functionality is in place

        this._data = data;
        this._wells = this._data.wells;
        this._sortedCompletionDates = this._data.sortedCompletionDates;
        this._excludeWellText = "";
        this._searchWellText = "";
        this._hideZeroCompletions = false;
        this._sortWellsBy = null;
        this._sortDirection = SortDirection.ASCENDING;

        // Extract all subzones
        this._subzones = [];
        this._data.zones.forEach((zone) =>
            WellCompletionsDataAccessor.propagateSubzoneArray(zone, stratigraphyColorSet, this._subzones)
        );
    }

    setExcludeWellText(excludeWell: string): void {
        this._excludeWellText = excludeWell;
    }

    setSearchWellText(searchWell: string): void {
        this._searchWellText = searchWell;
    }

    setHideZeroCompletions(hideZeroCompletions: boolean): void {
        this._hideZeroCompletions = hideZeroCompletions;
    }

    setSortWellsBy(sortWellsBy: SortWellsBy): void {
        this._sortWellsBy = sortWellsBy;
    }

    setSortDirection(sortDirection: SortDirection): void {
        this._sortDirection = sortDirection;
    }

    getSortedCompletionDates(): string[] {
        return this._sortedCompletionDates;
    }

    private getValidIndexOf(dateIndex: number): number {
        return this._sortedCompletionDates.findIndex((_, index) => index === dateIndex);
    }

    createPlotData(
        completionDateIndexSelection: number | [number, number],
        timeAggregation: TimeAggregationSelection
    ): PlotData | null {
        if (!this._data) return null;

        let dateIndexRange: [number, number] | null = null;
        if (typeof completionDateIndexSelection === "number") {
            const dateIndex = this.getValidIndexOf(completionDateIndexSelection);
            dateIndexRange = [dateIndex, dateIndex];
        } else {
            dateIndexRange = [
                this.getValidIndexOf(completionDateIndexSelection[0]),
                this.getValidIndexOf(completionDateIndexSelection[1]),
            ];
        }
        if (dateIndexRange[0] === -1 || dateIndexRange[1] === -1) return null;

        // Filter wells based on exclude and search text
        const wellNames = this._wells.map((well) => well.name);

        // Exclude wells based on exclude text
        let excludeWellNames: string[] = [];
        if (this._excludeWellText) {
            const excludeWellRegex = createWellNameRegexMatcher(this._excludeWellText);
            excludeWellNames = wellNames.filter((name) => {
                return excludeWellRegex(name);
            });
        }

        // Include wells based on search text
        let includeWellNames: string[] = wellNames;
        if (this._searchWellText) {
            const wellNameRegex = createWellNameRegexMatcher(this._searchWellText);
            includeWellNames = wellNames.filter((name) => {
                return wellNameRegex(name);
            });
        }

        const filteredWells = this._wells.filter(
            (well) => !excludeWellNames.includes(well.name) && includeWellNames.includes(well.name)
        );

        // TODO: Add filtering of well.attributes values when attribute information is available

        return WellCompletionsDataAccessor.computePlotData(
            this._subzones,
            filteredWells,
            dateIndexRange,
            timeAggregation,
            this._sortWellsBy,
            this._sortDirection,
            this._hideZeroCompletions,
            this._data?.units
        );
    }

    private static findEarliestWellCompletionDateIndex(well: WellCompletionsWell_api, subzones: Zone[]): number {
        let earliestCompDateIndex = Number.POSITIVE_INFINITY;
        subzones.forEach((zone) => {
            if (zone.name in well.completions) {
                const completion = well.completions[zone.name];
                //Find the earliest date for the given completion
                const earliestDate = completion.sortedCompletionDateIndices.find(
                    (_, index) => completion.open[index] > 0
                );
                if (earliestDate !== undefined) {
                    earliestCompDateIndex = Math.min(earliestCompDateIndex, earliestDate);
                }
            }
        });

        return earliestCompDateIndex;
    }

    private static computePlotData(
        subzones: Zone[],
        wells: WellCompletionsWell_api[],
        dateIndexRange: [number, number],
        timeAggregation: TimeAggregationSelection,
        sortWellsBy: SortWellsBy | null,
        sortDirection: SortDirection,
        hideZeroCompletions: boolean,
        units: WellCompletionsUnits_api
    ): PlotData {
        const wellPlotData: WellPlotData[] = [];

        // Subzones must be sorted by increasing depth, i.e. from most shallow to deepest
        for (const well of wells) {
            const completionsPlotData: CompletionPlotData[] = [];
            const earliestCompDateIndex = this.findEarliestWellCompletionDateIndex(well, subzones);
            let hasAtLeastOneOpenCompletion = false;
            subzones.forEach((zone, zoneIndex) => {
                const length = dateIndexRange[1] - dateIndexRange[0] + 1;
                const openValues = Array(length).fill(0);
                const shutValues = Array(length).fill(0);
                const khMeanValues = Array(length).fill(0);
                const khMinValues = Array(length).fill(0);
                const khMaxValues = Array(length).fill(0);
                if (zone.name in well.completions) {
                    const completion = well.completions[zone.name];
                    //Find values in the time range
                    let index = 0;
                    let currentOpenValue = 0;
                    let currentShutValue = 0;
                    let currentkhMeanValue = 0;
                    let currentkhMinValue = 0;
                    let currentkhMaxValue = 0;
                    for (let rangeI = 0; rangeI < length; rangeI++) {
                        const dateIndex = rangeI + dateIndexRange[0];
                        while (dateIndex >= completion.sortedCompletionDateIndices[index]) {
                            currentOpenValue = completion.open[index];
                            currentShutValue = completion.shut[index];
                            currentkhMeanValue = completion.khMean[index];
                            currentkhMinValue = completion.khMin[index];
                            currentkhMaxValue = completion.khMax[index];
                            index++;
                        }
                        openValues[rangeI] = currentOpenValue;
                        shutValues[rangeI] = currentShutValue;
                        khMeanValues[rangeI] = currentkhMeanValue;
                        khMinValues[rangeI] = currentkhMinValue;
                        khMaxValues[rangeI] = currentkhMaxValue;
                    }
                }
                const aggregateValues = TimeAggregationTypeFunction[timeAggregation];
                const zoneCompletion = {
                    zoneIndex,
                    open: aggregateValues(openValues),
                    shut: aggregateValues(shutValues),
                    khMean: aggregateValues(khMeanValues),
                    khMin: aggregateValues(khMinValues),
                    khMax: aggregateValues(khMaxValues),
                };

                if (zoneCompletion.open !== 0) {
                    hasAtLeastOneOpenCompletion = true;
                }

                //If value changed
                if (
                    completionsPlotData.length === 0 ||
                    !areCompletionsPlotDataValuesEqual(
                        completionsPlotData[completionsPlotData.length - 1],
                        zoneCompletion
                    )
                ) {
                    completionsPlotData.push(zoneCompletion);
                }
            });
            if (!hideZeroCompletions || hasAtLeastOneOpenCompletion) {
                wellPlotData.push({
                    ...well,
                    completions: completionsPlotData,
                    earliestCompDateIndex: earliestCompDateIndex,
                });
            }
        }

        // No sorting
        if (sortWellsBy === null) {
            return { stratigraphy: subzones, wells: wellPlotData, units: units };
        }

        // Sort wells based on selection
        let sortedWells = null;
        if (sortWellsBy === SortWellsBy.WELL_NAME) {
            sortedWells = createSortedWells(wellPlotData, sortWellsBy, sortDirection);
        } else {
            // If not sorted by well name:
            // - Perform selected sort, and then ensure sorted by ascending well name for the elements stated as equal in selected sort
            const sortBySequence = new Map([
                [sortWellsBy, sortDirection],
                [SortWellsBy.WELL_NAME, SortDirection.ASCENDING],
            ]);
            sortedWells = createSortedWellsFromSequence(wellPlotData, sortBySequence);
        }

        return {
            stratigraphy: subzones,
            wells: sortedWells,
            units: units,
        };
    }

    /**
     * Recursively propagate subzones from the API to the Zone object
     *
     * The subzone is: leaf nodes with a color from the stratigraphyColorSet
     *
     * @param apiZone
     * @param stratigraphyColorSet
     * @param subzoneArray
     */
    private static propagateSubzoneArray(
        apiZone: WellCompletionsZone_api,
        stratigraphyColorSet: ColorSet,
        subzoneArray: Zone[]
    ): void {
        const color =
            subzoneArray.length === 0 ? stratigraphyColorSet.getFirstColor() : stratigraphyColorSet.getNextColor();

        // Depth-first search to find all leaf nodes
        if (!apiZone.subzones || apiZone.subzones.length === 0) {
            subzoneArray.push({ name: apiZone.name, color: color });
        } else {
            apiZone.subzones.forEach((apiSubZone) =>
                WellCompletionsDataAccessor.propagateSubzoneArray(apiSubZone, stratigraphyColorSet, subzoneArray)
            );
        }
    }
}
