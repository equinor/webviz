import React from "react";

import { StratigraphicUnit_api, WellboreGeoHeader_api } from "@api";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Select, SelectOption } from "@lib/components/Select";
import { Modify } from "@lib/utils/typing";
import { TemplatePlotConfig } from "@modules/WellLogViewer/types";
import { makeTrackPlot } from "@modules/WellLogViewer/utils/logViewerTemplate";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";
import { QueryObserverResult } from "@tanstack/react-query";

import { useAtomValue } from "jotai";
import _ from "lodash";
import { StratigraphicUnit } from "src/api/models/StratigraphicUnit";

import { TrackSettingFragmentProps } from "./private-components/TrackSettings";

import { wellboreGeologyHeadersQueryAtom, wellboreStratigraphicUnitsQueryAtom } from "../../atoms/queryAtoms";

export function DiscreteTrackSettings(props: TrackSettingFragmentProps): React.ReactNode {
    const { onFieldChange } = props;
    const currentPlot = props.trackConfig.plots[0];

    const [activeSource, setActiveSource] = React.useState(currentPlot?._source ?? "geology");

    const categoryId = React.useId();
    const selectId = React.useId();

    const geoHeadersQuery = useAtomValue(wellboreGeologyHeadersQueryAtom);
    const wellboreStratigraphicUnitsQuery = useAtomValue(wellboreStratigraphicUnitsQueryAtom);

    const { activeQuery, selectOptions } = makeCurveOptions(
        activeSource,
        geoHeadersQuery,
        wellboreStratigraphicUnitsQuery
    );

    const queryError = usePropagateApiErrorToStatusWriter(activeQuery, props.statusWriter) ?? "";

    const handleGeoHeaderSelect = React.useCallback(
        function handleGeoHeaderSelect([choice]: string[]) {
            const chosenOption = selectOptions.find(({ value }) => value === choice);

            if (!chosenOption) return console.warn(`Selected value '${choice}' not found`);

            const newTrackPlot = makePlotConfigForChoice(activeSource, chosenOption);

            onFieldChange({ plots: [newTrackPlot] });
        },
        [selectOptions, activeSource, onFieldChange]
    );

    return (
        <>
            <label htmlFor={categoryId}>Type</label>
            <Dropdown
                id={categoryId}
                value={activeSource}
                options={makeDataGroupOptions()}
                onChange={(v) => setActiveSource(v)}
            />

            <div className="col-span-2">
                <label htmlFor={selectId}>Geological header</label>
                <PendingWrapper isPending={activeQuery.isPending} errorMessage={queryError}>
                    <Select
                        id={selectId}
                        value={currentPlot?._sourceId ? [currentPlot._sourceId] : []}
                        options={selectOptions}
                        size={Math.max(Math.min(6, selectOptions.length), 2)}
                        onChange={handleGeoHeaderSelect}
                    />
                </PendingWrapper>
            </div>
        </>
    );
}

type GeoHeaderSelectOption = SelectOption & {
    _header: WellboreGeoHeader_api;
};

type DataGroupDropdownOption = Modify<DropdownOption, { value: TemplatePlotConfig["_source"] }>;

function makeDataGroupOptions(): DataGroupDropdownOption[] {
    return [
        { label: "Geology", value: "geology" },
        { label: "Stratigraphy", value: "stratigraphy" },
    ];
}

function makeCurveOptions(
    chosenSource: TemplatePlotConfig["_source"],
    geoHeadersQuery: QueryObserverResult<WellboreGeoHeader_api[], Error>,
    stratUnitsQuery: QueryObserverResult<StratigraphicUnit_api[], Error>
): { selectOptions: SelectOption[]; activeQuery: QueryObserverResult } {
    switch (chosenSource) {
        case "geology":
            return {
                selectOptions: makeGeoHeaderOptions(geoHeadersQuery.data ?? []),
                activeQuery: geoHeadersQuery,
            };
        case "stratigraphy":
            return {
                selectOptions: makeStratigraphyOptions(stratUnitsQuery?.data ?? []),
                activeQuery: stratUnitsQuery,
            };
        // case "welllog":

        default:
            throw new Error(`Unknown category: ${chosenSource}`);
    }
}

function makeGeoHeaderOptions(geoHeaders: WellboreGeoHeader_api[]): GeoHeaderSelectOption[] {
    return geoHeaders.map((header) => {
        return {
            _header: header,
            value: header.uuid,
            label: header.identifier,
            adornment: (
                <span
                    className="order-1 text-[0.75rem] flex-shrink-[9999] overflow-hidden leading-tight block bg-gray-400 px-1 py-0.5 rounded text-white text-ellipsis whitespace-nowrap w-auto "
                    title={header.source}
                >
                    {shortenGeoSourceName(header.source)}
                </span>
            ),
        };
    });
}

function makeStratigraphyOptions(stratUnits: StratigraphicUnit[]) {
    const types = _.groupBy(stratUnits, "stratUnitType");

    const opts = [] as SelectOption[];

    if (types.group) opts.push({ label: "Groups", value: "group" });
    if (types.formation) opts.push({ label: "Formations", value: "formation" });
    if (types.subzone) opts.push({ label: "Subzone", value: "subzone" });

    return opts;
}

function makePlotConfigForChoice(
    chosenSource: TemplatePlotConfig["_source"],
    choice: SelectOption
): TemplatePlotConfig {
    if (chosenSource === "geology") {
        const geoChoice = choice as GeoHeaderSelectOption;

        return makeTrackPlot({
            _source: "geology",
            _sourceId: geoChoice._header.uuid,
            name: geoChoice.label + geoChoice._header.source,
            style: "discrete",
            type: "stacked",
            showLines: false,
        });
    } else if (chosenSource === "stratigraphy") {
        return makeTrackPlot({
            _source: "stratigraphy",
            _sourceId: choice.value,
            name: choice.label,
            style: "discrete",
            type: "stacked",
            showLines: false,
        });
    } else {
        throw new Error(`Unknown source choice '${chosenSource}'`);
    }
}

function shortenGeoSourceName(sourceName: string, maxLength = 10) {
    // ! Unsure what sources there are, but this one seems to show up alot
    if (sourceName === "OpenWorks R5000") return "OpenWorks";
    // Fallback to ellipse for other long names
    // TODO: Generalized shortening that doesn't truncate unless absolutely neccessary?
    else if (sourceName.length > maxLength) return sourceName.substring(0, 9) + "…";
    // Fallback to name in all other cases
    else return sourceName;
}
