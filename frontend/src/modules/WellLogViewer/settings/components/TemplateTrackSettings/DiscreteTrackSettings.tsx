import React from "react";

import { WellLogCurveSourceEnum_api, WellboreLogCurveHeader_api } from "@api";
import { Checkbox } from "@lib/components/Checkbox";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Select, SelectOption } from "@lib/components/Select";
import { TemplatePlotConfig } from "@modules/WellLogViewer/types";
import { makeTrackPlot } from "@modules/WellLogViewer/utils/logViewerTemplate";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";
import { ArrowDownward } from "@mui/icons-material";

import { useAtomValue } from "jotai";
import _ from "lodash";

import { TrackSettingFragmentProps } from "./private-components/TrackSettings";

import { curveSourceToText, simplifyLogName } from "../../../utils/strings";
import { availableDiscreteCurvesAtom, availableFlagCurvesAtom } from "../../atoms/derivedAtoms";
import { wellLogCurveHeadersQueryAtom } from "../../atoms/queryAtoms";

const DEFAULT_SOURCE = WellLogCurveSourceEnum_api.SMDA_GEOLOGY;

export function DiscreteTrackSettings(props: TrackSettingFragmentProps): React.ReactNode {
    const { onFieldChange } = props;
    const currentPlot = props.trackConfig.plots[0];

    const currentCurveHeader = currentPlot?._curveHeader;

    const showLinesCheckId = React.useId();
    const showLabelsCheckId = React.useId();
    const labelRotationId = React.useId();

    const categorySelectId = React.useId();
    const curveSelectId = React.useId();

    const [activeSource, setActiveSource] = React.useState(currentCurveHeader?.source ?? DEFAULT_SOURCE);

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

    const headersForCategory = availableCurveHeaders.filter((header) => activeSource === header.source);

    const selectOptions = makeCurveOptions(activeSource, headersForCategory);

    const handleCurveHeaderSelect = React.useCallback(
        function handleCurveHeaderSelect([choice]: string[]) {
            const chosenHeader = availableCurveHeaders.find(
                ({ source, sourceId }) => source === activeSource && sourceId === choice
            );

            if (!chosenHeader) return console.warn(`Selected value '${choice}' not found`);

            const newTrackPlot = makeTrackPlot({
                ...currentPlot,
                _curveHeader: chosenHeader,
            });

            onFieldChange({ plots: [newTrackPlot] });
        },
        [availableCurveHeaders, onFieldChange, activeSource, currentPlot]
    );

    const handlePlotSettingsChange = React.useCallback(
        function handlePlotSettingsChange(changes: Partial<TemplatePlotConfig>) {
            const newPlot = makeTrackPlot({ ...currentPlot, ...changes });

            onFieldChange({ plots: [newPlot] });
        },
        [currentPlot, onFieldChange]
    );

    return (
        <>
            <label htmlFor={showLinesCheckId}>Show lines</label>
            <Checkbox
                id={showLinesCheckId}
                checked={currentPlot.showLines ?? true}
                onChange={(e) => handlePlotSettingsChange({ showLines: e.target.checked })}
            />

            <label htmlFor={showLabelsCheckId}>Show labels</label>
            <Checkbox
                id={showLabelsCheckId}
                checked={currentPlot.showLabels ?? true}
                onChange={(e) => handlePlotSettingsChange({ showLabels: e.target.checked })}
            />

            <label htmlFor={labelRotationId}>Label direction</label>

            <RadioGroup
                disabled={!(currentPlot.showLabels ?? true)}
                direction="horizontal"
                value={currentPlot.labelRotation ?? 0}
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
                <Dropdown id={categorySelectId} value={activeSource} options={categories} onChange={setActiveSource} />
            </PendingWrapper>

            <div className="col-span-2">
                <label htmlFor={curveSelectId}>Curve</label>
                <PendingWrapper isPending={curveHeadersQuery.isPending} errorMessage={curveHeadersError ?? ""}>
                    <Select
                        id={curveSelectId}
                        value={currentCurveHeader?.sourceId ? [currentCurveHeader.sourceId] : []}
                        options={selectOptions}
                        size={Math.max(Math.min(6, selectOptions.length), 2)}
                        onChange={handleCurveHeaderSelect}
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
                label: _.startCase(header.curveName),
                value: header.sourceId,
                adornment: (
                    <span
                        className="order-1 text-[0.75rem] flex-shrink-[9999] overflow-hidden leading-tight block bg-gray-400 px-1 py-0.5 rounded text-white text-ellipsis whitespace-nowrap w-auto "
                        title={header.logName}
                    >
                        {simplifyLogName(header.logName, 12)}
                    </span>
                ),
            };
        })
        .value();
}
