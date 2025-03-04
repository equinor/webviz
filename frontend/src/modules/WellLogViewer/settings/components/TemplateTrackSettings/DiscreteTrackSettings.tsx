import React from "react";

import type { WellboreLogCurveHeader_api } from "@api";
import { WellLogCurveSourceEnum_api, WellLogCurveTypeEnum_api } from "@api";
import { Checkbox } from "@lib/components/Checkbox";
import type { DropdownOption } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { RadioGroup } from "@lib/components/RadioGroup";
import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";
import type { TemplatePlotConfig } from "@modules/WellLogViewer/types";
import { makeTrackPlot } from "@modules/WellLogViewer/utils/logViewerTemplate";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";
import { ArrowDownward } from "@mui/icons-material";
import type { UseQueryResult } from "@tanstack/react-query";

import { useAtomValue } from "jotai";
import _ from "lodash";

import type { TrackSettingFragmentProps } from "./private-components/TrackSettings";

import {
    curveSourceToText,
    findCurveHeaderBySelectValue,
    makeSelectValueForCurveHeader,
    simplifyLogName,
} from "../../../utils/strings";
import { availableDiscreteCurvesAtom, availableFlagCurvesAtom } from "../../atoms/derivedAtoms";
import { wellLogCurveHeadersQueryAtom } from "../../atoms/queryAtoms";

const DEFAULT_SOURCE = WellLogCurveSourceEnum_api.SMDA_GEOLOGY;

export function DiscreteTrackSettings(props: TrackSettingFragmentProps): React.ReactNode {
    const { onFieldChange } = props;

    // Make sure the config type is correct
    if (props.trackConfig._type !== WellLogCurveTypeEnum_api.DISCRETE) {
        throw new Error("Expected track-config to be of type ");
    }

    // Guaranteed to have one plot entry
    const discretePlotConfig = props.trackConfig.plots[0];
    const currentCurveHeader = discretePlotConfig._curveHeader;

    const showLinesCheckId = React.useId();
    const showLabelsCheckId = React.useId();
    const labelRotationId = React.useId();

    const categorySelectId = React.useId();
    const curveSelectId = React.useId();

    const [activeSource, setActiveSource] = React.useState(currentCurveHeader?.source ?? DEFAULT_SOURCE);

    const curveHeadersQuery = useAtomValue(wellLogCurveHeadersQueryAtom);
    const curveHeadersError = usePropagateApiErrorToStatusWriter(
        // ! Cast is safe, since MergedQueryResult includes `.error`
        curveHeadersQuery as UseQueryResult,
        props.statusWriter,
    );

    const availableDiscreteCurves = useAtomValue(availableDiscreteCurvesAtom);
    const availableFlagCurves = useAtomValue(availableFlagCurvesAtom);
    const availableCurveHeaders = React.useMemo(
        () => [...availableDiscreteCurves, ...availableFlagCurves],
        [availableDiscreteCurves, availableFlagCurves],
    );

    const headersForSource = availableCurveHeaders.filter((header) => activeSource === header.source);

    const categoryOptions = makeLogSourceOptions(availableCurveHeaders);
    const selectOptions = makeCurveOptions(activeSource, headersForSource);

    const handleCurveHeaderSelect = React.useCallback(
        function handleCurveHeaderSelect([choice]: string[]) {
            const headerChoice = findCurveHeaderBySelectValue(headersForSource, choice);
            if (!headerChoice) throw new Error(`Selected value '${choice}' not found`);

            const newTrackPlot = makeTrackPlot({
                ...discretePlotConfig,
                _curveHeader: headerChoice,
            });

            onFieldChange({ plots: [newTrackPlot] });
        },
        [onFieldChange, discretePlotConfig, headersForSource],
    );

    const handlePlotSettingsChange = React.useCallback(
        function handlePlotSettingsChange(changes: Partial<TemplatePlotConfig>) {
            const newPlot = makeTrackPlot({ ...discretePlotConfig, ...changes });

            onFieldChange({ plots: [newPlot] });
        },
        [discretePlotConfig, onFieldChange],
    );

    return (
        <>
            <label htmlFor={showLinesCheckId}>Show lines</label>
            <Checkbox
                id={showLinesCheckId}
                checked={discretePlotConfig.showLines ?? true}
                onChange={(e) => handlePlotSettingsChange({ showLines: e.target.checked })}
            />

            <label htmlFor={showLabelsCheckId}>Show labels</label>
            <Checkbox
                id={showLabelsCheckId}
                checked={discretePlotConfig.showLabels ?? true}
                onChange={(e) => handlePlotSettingsChange({ showLabels: e.target.checked })}
            />

            <label htmlFor={labelRotationId}>Label direction</label>

            <RadioGroup
                disabled={!(discretePlotConfig.showLabels ?? true)}
                direction="horizontal"
                value={discretePlotConfig.labelRotation ?? 0}
                options={[
                    {
                        label: <ArrowDownward titleAccess="Downwards" fontSize="inherit" />,
                        value: 0,
                    },
                    {
                        label: <ArrowDownward titleAccess="Rightwards" className="-rotate-90" fontSize="inherit" />,
                        value: 270,
                    },
                ]}
                onChange={(_e, v) => handlePlotSettingsChange({ labelRotation: v })}
            />

            <label htmlFor={categorySelectId}>Source</label>

            <PendingWrapper isPending={curveHeadersQuery.isPending} errorMessage={curveHeadersError ?? ""}>
                <Dropdown
                    id={categorySelectId}
                    value={activeSource}
                    options={categoryOptions}
                    onChange={setActiveSource}
                />
            </PendingWrapper>

            <div className="col-span-2">
                <label htmlFor={curveSelectId}>Curve</label>
                <PendingWrapper isPending={curveHeadersQuery.isPending} errorMessage={curveHeadersError ?? ""}>
                    <Select
                        id={curveSelectId}
                        value={currentCurveHeader ? [makeSelectValueForCurveHeader(currentCurveHeader)] : []}
                        options={selectOptions}
                        size={Math.max(Math.min(6, selectOptions.length), 2)}
                        onChange={handleCurveHeaderSelect}
                    />
                </PendingWrapper>
            </div>
        </>
    );
}

function makeLogSourceOptions(headers: WellboreLogCurveHeader_api[]): DropdownOption<WellLogCurveSourceEnum_api>[] {
    return _.chain(headers)
        .map("source")
        .uniq()
        .map<DropdownOption<WellLogCurveSourceEnum_api>>((source) => ({
            value: source,
            label: curveSourceToText(source),
        }))
        .value();
}

function makeCurveOptions(
    chosenSource: WellLogCurveSourceEnum_api,
    headers: WellboreLogCurveHeader_api[],
): SelectOption[] {
    return _.chain(headers)
        .filter(["source", chosenSource])
        .map<SelectOption>((header) => {
            return {
                value: makeSelectValueForCurveHeader(header),
                label: _.startCase(header.curveName),
                adornment: (
                    <span
                        className="order-1 text-xs flex-shrink-[9999] overflow-hidden leading-tight block bg-gray-400 px-1 py-0.5 rounded text-white text-ellipsis whitespace-nowrap w-auto "
                        title={header.logName}
                    >
                        {simplifyLogName(header.logName, 12)}
                    </span>
                ),
            };
        })
        .value();
}
