import React from "react";

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import type { ModuleSettingsProps } from "@framework/Module";
import { KeyKind } from "@framework/types/dataChannnel";
import { CheckboxCompositions } from "@lib/components/Checkbox/compositions";
import { Combobox } from "@lib/components/Combobox";
import { Setting } from "@lib/components/Setting";
import { Slider } from "@lib/components/Slider";
import { ParametersSelector } from "@modules/_shared/components/ParameterSelector";

import type { Interfaces } from "../interfaces";
import { PlotType } from "../typesAndEnums";

import {
    correlationThresholdAtom,
    filterColumnsAtom,
    filterRowsAtom,
    hideIndividualCellsAtom,
    plotTypeAtom,
    showLabelsAtom,
    useFixedColorRangeAtom,
    receivedChannelAtom,
    selectedParameterIdentsAtom,
} from "./atoms/baseAtoms";
import { availableParameterIdentsAtom } from "./atoms/derivedAtoms";

const plotTypeItems = [
    {
        value: PlotType.ParameterResponseMatrix,
        label: "Responses vs. parameters matrix",
    },
    {
        value: PlotType.FullTriangularMatrix,
        label: "Full (Triangular) matrix",
    },
    {
        value: PlotType.FullMirroredMatrix,
        label: "Full (Mirrored) matrix",
    },
];

export function Settings({ settingsContext }: ModuleSettingsProps<Interfaces>) {
    const [parameterIdents, setParameterIdents] = useAtom(selectedParameterIdentsAtom);
    const [plotType, setPlotType] = useAtom(plotTypeAtom);
    const [showLabels, setShowLabels] = useAtom(showLabelsAtom);
    const [useFixedColorRange, setUseFixedColorRange] = useAtom(useFixedColorRangeAtom);
    const setReceivedChannel = useSetAtom(receivedChannelAtom);
    const availableParameterIdents = useAtomValue(availableParameterIdentsAtom);
    const [correlationThreshold, setCorrelationThreshold] = useAtom(correlationThresholdAtom);
    const [hideIndividualCells, setHideIndividualCells] = useAtom(hideIndividualCellsAtom);
    const [filterColumns, setFilterColumns] = useAtom(filterColumnsAtom);
    const [filterRows, setFilterRows] = useAtom(filterRowsAtom);
    const receiverResponse = settingsContext.useChannelReceiver({
        receiverIdString: "channelResponse",
        expectedKindsOfKeys: [KeyKind.REALIZATION],
    });
    const receiverResponse2 = settingsContext.useChannelReceiver({
        receiverIdString: "channelResponse2",
        expectedKindsOfKeys: [KeyKind.REALIZATION],
    });
    const receiverResponse3 = settingsContext.useChannelReceiver({
        receiverIdString: "channelResponse3",
        expectedKindsOfKeys: [KeyKind.REALIZATION],
    });
    const receiverResponses = React.useMemo(
        () => [receiverResponse, receiverResponse2, receiverResponse3],
        [receiverResponse, receiverResponse2, receiverResponse3],
    );

    React.useEffect(
        function updateReceivedChannel() {
            setReceivedChannel(receiverResponses);
        }, // We only want to listen to revision number changes, but we need the whole channel response to set it
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [
            receiverResponse.revisionNumber,
            receiverResponse2.revisionNumber,
            receiverResponse3.revisionNumber,
            setReceivedChannel,
        ],
    );

    function handleThresholdChanged(value: number | readonly number[] | null) {
        // Ensure threshold is between 0 and 1
        const threshold =
            value === null ? 0.0 : Math.max(0.0, Math.min(1.0, Math.abs(Array.isArray(value) ? value[0] : value)));
        setCorrelationThreshold(threshold);
    }

    const correlationSliderRef = React.useRef<HTMLDivElement>(null);

    return (
        <Setting.ScrollArea>
            <Setting.Panel>
                <Setting.Section title="Plot settings" defaultOpen>
                    <Setting.Field label="Matrix type" stacked>
                        <Combobox items={plotTypeItems} value={plotType} onValueChange={(v) => v && setPlotType(v)} />
                    </Setting.Field>
                    <Setting.Field
                        label={`Correlation Cutoff (absolute): ${correlationThreshold}`}
                        stacked
                        labelFor={correlationSliderRef}
                    >
                        <div className="gap-vertical-xs flex flex-col">
                            <Slider
                                value={correlationThreshold}
                                onValueChange={handleThresholdChanged}
                                min={0}
                                max={1}
                                step={0.01}
                                ref={correlationSliderRef}
                            />
                            <div className="gap-vertical-xs flex flex-col">
                                <CheckboxCompositions.WithLabel
                                    label="Blank individual cells below cutoff"
                                    checked={hideIndividualCells}
                                    onCheckedChange={setHideIndividualCells}
                                    size="small"
                                />
                                <CheckboxCompositions.WithLabel
                                    label="Filter columns below cutoff"
                                    checked={filterColumns}
                                    onCheckedChange={setFilterColumns}
                                    size="small"
                                />
                                <CheckboxCompositions.WithLabel
                                    label="Filter rows below cutoff"
                                    checked={filterRows}
                                    onCheckedChange={setFilterRows}
                                    size="small"
                                />
                            </div>
                        </div>
                    </Setting.Field>
                    <Setting.Field label="Scale and labels" stacked>
                        <div className="gap-vertical-xs flex flex-col">
                            <CheckboxCompositions.WithLabel
                                label="Show parameter labels"
                                checked={showLabels}
                                onCheckedChange={setShowLabels}
                                size="small"
                            />
                            <CheckboxCompositions.WithLabel
                                label="Use fixed color range (-1 / 1)"
                                checked={useFixedColorRange}
                                onCheckedChange={setUseFixedColorRange}
                                size="small"
                            />
                        </div>
                    </Setting.Field>
                </Setting.Section>
                <Setting.Section title="Parameter selection" defaultOpen>
                    <ParametersSelector
                        allParameterIdents={availableParameterIdents}
                        selectedParameterIdents={parameterIdents}
                        onChange={setParameterIdents}
                    />
                </Setting.Section>
            </Setting.Panel>
        </Setting.ScrollArea>
    );
}
