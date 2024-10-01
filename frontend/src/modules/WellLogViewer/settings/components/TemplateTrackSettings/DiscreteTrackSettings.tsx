import React from "react";

import { WellboreGeoHeader_api } from "@api";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Select, SelectOption } from "@lib/components/Select";
import { makeTrackPlot } from "@modules/WellLogViewer/utils/logViewerTemplate";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import { useAtomValue } from "jotai";

import { TrackSettingFragmentProps } from "./private-components/TrackSettings";

import { wellboreGeologyHeadersQueryAtom } from "../../atoms/queryAtoms";

export function DiscreteTrackSettings(props: TrackSettingFragmentProps): React.ReactNode {
    const { onFieldChange } = props;
    const currentPlot = props.trackConfig.plots[0];

    const selectId = React.useId();

    const geoHeadersQuery = useAtomValue(wellboreGeologyHeadersQueryAtom);
    const geoHeaders = geoHeadersQuery.data;

    const geoHeadersError = usePropagateApiErrorToStatusWriter(geoHeadersQuery, props.statusWriter) ?? "";

    const headerOptions = makeGeoHeaderOptions(geoHeaders ?? []);

    const handleGeoHeaderSelect = React.useCallback(
        function handleGeoHeaderSelect([choice]: string[]) {
            const chosenOption = headerOptions.find(({ value }) => value === choice);
            const chosenHeader = chosenOption?._header;

            if (!chosenHeader) {
                console.warn("Could not find geoheader for choice", choice);
                onFieldChange({ plots: [] });
                return;
            } else {
                const newTrackPlots = makeTrackPlot({
                    _id: chosenHeader.uuid,
                    _source: "geology",
                    _sourceId: chosenHeader.uuid,
                    name: chosenOption.label,
                    style: "discrete",
                    type: "stacked",
                    labelRotation: 270,
                    showLines: false,
                });

                onFieldChange({ plots: [newTrackPlots] });
            }
        },
        [headerOptions, onFieldChange]
    );

    return (
        <>
            {/* TODO: Choose a source? */}

            <div className="col-span-2">
                <label htmlFor={selectId}>Geological header</label>
                <PendingWrapper isPending={geoHeadersQuery.isPending} errorMessage={geoHeadersError}>
                    <Select
                        id={selectId}
                        value={currentPlot?._sourceId ? [currentPlot._sourceId] : []}
                        options={headerOptions}
                        size={Math.max(Math.min(6, headerOptions.length), 2)}
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

function shortenGeoSourceName(sourceName: string, maxLength = 10) {
    // ! Unsure what sources there are, but this one seems to show up alot
    if (sourceName === "OpenWorks R5000") return "OpenWorks";
    // Fallback to ellipse for other long names
    // TODO: Generalized shortening that doesn't truncate unless absolutely neccessary?
    else if (sourceName.length > maxLength) return sourceName.substring(0, 9) + "…";
    // Fallback to name in all other cases
    else return sourceName;
}
