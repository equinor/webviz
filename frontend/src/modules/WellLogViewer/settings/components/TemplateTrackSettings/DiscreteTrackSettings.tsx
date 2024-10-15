import React from "react";

import { WellLogCurveSourceEnum_api, WellboreLogCurveHeader_api } from "@api";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Select, SelectOption } from "@lib/components/Select";
import { TemplatePlotConfig } from "@modules/WellLogViewer/types";
import { makeTrackPlot } from "@modules/WellLogViewer/utils/logViewerTemplate";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import { useAtomValue } from "jotai";
import _ from "lodash";

import { TrackSettingFragmentProps } from "./private-components/TrackSettings";

import { availableDiscreteCurvesAtom, availableFlagCurvesAtom } from "../../atoms/derivedAtoms";
import { wellLogCurveHeadersQueryAtom } from "../../atoms/queryAtoms";
import { curveSourceToText } from "../_shared/strings";

const DEFAULT_SOURCE = WellLogCurveSourceEnum_api.SMDA_GEOLOGY;

export function DiscreteTrackSettings(props: TrackSettingFragmentProps): React.ReactNode {
    const { onFieldChange } = props;
    const currentPlot = props.trackConfig.plots[0];

    const currentCurveHeader = currentPlot?._curveHeader;

    const [activeSource, setActiveSource] = React.useState(currentCurveHeader?.source ?? DEFAULT_SOURCE);

    const categoryId = React.useId();
    const selectId = React.useId();

    const curveHeadersQuery = useAtomValue(wellLogCurveHeadersQueryAtom);
    const curveHeadersError = usePropagateApiErrorToStatusWriter(curveHeadersQuery, props.statusWriter);

    const availableDiscreteCurves = useAtomValue(availableDiscreteCurvesAtom);
    const availableFlagCurves = useAtomValue(availableFlagCurvesAtom);
    const availableCurveHeaders = React.useMemo(
        () => [...availableDiscreteCurves, ...availableFlagCurves],
        [availableDiscreteCurves, availableFlagCurves]
    );
    const categories = _.chain(availableCurveHeaders)
        .map("source")
        .uniq()
        .map((source) => ({ value: source, label: curveSourceToText(source) }))
        .value() as DropdownOption<WellLogCurveSourceEnum_api>[];

    const selectOptions = makeCurveOptions(activeSource, availableCurveHeaders);

    const handleGeoHeaderSelect = React.useCallback(
        function handleGeoHeaderSelect([choice]: string[]) {
            const chosenOption = availableCurveHeaders.find(
                ({ source, sourceId }) => source === activeSource && sourceId === choice
            );

            if (!chosenOption) return console.warn(`Selected value '${choice}' not found`);

            const newTrackPlot = makePlotConfigForChoice(chosenOption);

            onFieldChange({ plots: [newTrackPlot] });
        },
        [availableCurveHeaders, onFieldChange, activeSource]
    );

    return (
        <>
            <label htmlFor={categoryId}>Type</label>

            <PendingWrapper isPending={curveHeadersQuery.isPending} errorMessage={curveHeadersError ?? ""}>
                <Dropdown id={categoryId} value={activeSource} options={categories} onChange={setActiveSource} />
            </PendingWrapper>

            <div className="col-span-2">
                <label htmlFor={selectId}>Curve</label>
                <PendingWrapper isPending={curveHeadersQuery.isPending} errorMessage={curveHeadersError ?? ""}>
                    <Select
                        id={selectId}
                        value={currentCurveHeader?.sourceId ? [currentCurveHeader.sourceId] : []}
                        options={selectOptions}
                        size={Math.max(Math.min(6, selectOptions.length), 2)}
                        onChange={handleGeoHeaderSelect}
                    />
                </PendingWrapper>
            </div>
        </>
    );
}

function makeCurveOptions(
    chosenSource: WellLogCurveSourceEnum_api,
    headers: WellboreLogCurveHeader_api[]
): SelectOption[] {
    return _.chain(headers)
        .filter(["source", chosenSource])
        .map((header): SelectOption => {
            return {
                label: header.curveName,
                value: header.sourceId,
            };
        })
        .value();
}

function makePlotConfigForChoice(chosenHeader: WellboreLogCurveHeader_api): TemplatePlotConfig {
    const settings: Parameters<typeof makeTrackPlot>[0] = {
        _curveHeader: chosenHeader,
        name: chosenHeader.curveName,
        type: "stacked",
    };

    switch (chosenHeader.source) {
        case WellLogCurveSourceEnum_api.SMDA_GEOLOGY:
            settings.showLines = false;
            break;
        case WellLogCurveSourceEnum_api.SMDA_STRATIGRAPHY:
        case WellLogCurveSourceEnum_api.SSDL_WELL_LOG:
            settings.showLines = true;
            break;

        default:
            throw new Error(`Unsupported source choice '${chosenHeader.source}'`);
    }

    return makeTrackPlot(settings);
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
