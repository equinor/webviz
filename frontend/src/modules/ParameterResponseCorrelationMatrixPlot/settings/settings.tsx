import React from "react";

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import type { ParameterIdent } from "@framework/EnsembleParameters";
import type { ModuleSettingsProps } from "@framework/Module";
import { KeyKind } from "@framework/types/dataChannnel";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
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

const plotTypesOptions = [
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
        () => {
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

    function handleParametersChanged(parameterIdents: ParameterIdent[]) {
        setParameterIdents(parameterIdents);
    }
    function handleShowLabelsChanged(e: React.ChangeEvent<HTMLInputElement>) {
        setShowLabels(e.target.checked);
    }
    function handleUseFixedColorRangeChanged(e: React.ChangeEvent<HTMLInputElement>) {
        setUseFixedColorRange(e.target.checked);
    }
    function handlePlotTypeChanged(e: React.ChangeEvent<HTMLInputElement>) {
        setPlotType(e.target.value as PlotType);
    }
    function handleThresholdChanged(e: React.ChangeEvent<HTMLInputElement>) {
        let threshold = e.target.value ? parseFloat(e.target.value) : 0.0;
        threshold = Math.max(0.0, Math.min(1.0, Math.abs(threshold))); // Ensure threshold is between 0 and 1
        setCorrelationThreshold(threshold);
    }
    function handleHideIndividualCellsChanged(e: React.ChangeEvent<HTMLInputElement>) {
        setHideIndividualCells(e.target.checked);
    }
    function handleFilterColumnsChanged(e: React.ChangeEvent<HTMLInputElement>) {
        setFilterColumns(e.target.checked);
    }
    function handleFilterRowsChanged(e: React.ChangeEvent<HTMLInputElement>) {
        setFilterRows(e.target.checked);
    }
    return (
        <div className="flex flex-col gap-2">
            <CollapsibleGroup title="Plot settings" expanded>
                <div className="flex flex-col gap-2">
                    <Label text="Matrix type">
                        <RadioGroup
                            value={plotType as string}
                            options={plotTypesOptions}
                            onChange={handlePlotTypeChanged}
                        />
                    </Label>

                    <Checkbox label={"Show parameter labels"} checked={showLabels} onChange={handleShowLabelsChanged} />

                    <Checkbox
                        label="Use fixed color range (-1 / 1)"
                        checked={useFixedColorRange}
                        onChange={handleUseFixedColorRangeChanged}
                    />
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup title="Correlation settings" expanded>
                <div className="flex flex-col gap-2">
                    <Label text="Correlation cutoff (absolute)">
                        <input
                            type="number"
                            step={0.01}
                            min={0}
                            max={1}
                            value={correlationThreshold ?? ""}
                            onChange={handleThresholdChanged}
                            className="w-full p-1 border border-gray-300 rounded"
                        />
                    </Label>
                    <Checkbox
                        label="Blank individual cells below cutoff"
                        checked={hideIndividualCells}
                        onChange={handleHideIndividualCellsChanged}
                    />
                    <Checkbox
                        label="Filter columns below cutoff"
                        checked={filterColumns}
                        onChange={handleFilterColumnsChanged}
                    />
                    <Checkbox
                        label="Filter rows below cutoff"
                        checked={filterRows}
                        onChange={handleFilterRowsChanged}
                    />
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup title="Parameter selection" expanded>
                <ParametersSelector
                    allParameterIdents={availableParameterIdents}
                    selectedParameterIdents={parameterIdents}
                    onChange={handleParametersChanged}
                />
            </CollapsibleGroup>
        </div>
    );
}
