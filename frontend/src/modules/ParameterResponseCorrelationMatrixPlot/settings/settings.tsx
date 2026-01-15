import React from "react";

import { useAtom } from "jotai";

import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { ParameterIdent } from "@framework/EnsembleParameters";
import type { ModuleSettingsProps } from "@framework/Module";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { KeyKind } from "@framework/types/dataChannnel";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { ParametersSelector } from "@modules/_shared/components/ParameterSelector";
import { getContinuousAndNonConstantParameterIdentsInEnsembles } from "@modules/_shared/parameterUnions";

import type { Interfaces } from "../interfaces";
import { PlotType } from "../typesAndEnums";

import {
    correlationThresholdAtom,
    filterColumnsAtom,
    filterRowsAtom,
    hideIndividualCellsAtom,
    parameterIdentsAtom,
    plotTypeAtom,
    showLabelsAtom,
    useFixedColorRangeAtom,
} from "./atoms/baseAtoms";

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

export function Settings({ settingsContext, workbenchSession }: ModuleSettingsProps<Interfaces>) {
    const [parameterIdents, setParameterIdents] = useAtom(parameterIdentsAtom);
    const [plotType, setPlotType] = useAtom(plotTypeAtom);
    const [showLabels, setShowLabels] = useAtom(showLabelsAtom);
    const [useFixedColorRange, setUseFixedColorRange] = useAtom(useFixedColorRangeAtom);

    const [correlationThreshold, setCorrelationThreshold] = useAtom(correlationThresholdAtom);
    const [hideIndividualCells, setHideIndividualCells] = useAtom(hideIndividualCellsAtom);
    const [filterColumns, setFilterColumns] = useAtom(filterColumnsAtom);
    const [filterRows, setFilterRows] = useAtom(filterRowsAtom);
    const receiverResponse = settingsContext.useChannelReceiver({
        receiverIdString: "channelResponse",
        expectedKindsOfKeys: [KeyKind.REALIZATION],
    });

    const ensembleIdentStringsFromChannels: string[] = React.useMemo(() => {
        if (receiverResponse.channel && receiverResponse.channel.contents) {
            return receiverResponse.channel.contents.map((content) => content.metaData.ensembleIdentString);
        }
        return [];
    }, [receiverResponse.channel]);

    const ensembleSet = workbenchSession.getEnsembleSet();

    const ensembleIdentsFromChannels = React.useMemo(() => {
        return ensembleIdentStringsFromChannels.flatMap((id): (RegularEnsembleIdent | DeltaEnsembleIdent)[] => {
            if (!ensembleSet.findEnsembleByIdentString(id)) {
                return [];
            }
            if (RegularEnsembleIdent.isValidEnsembleIdentString(id)) {
                return [RegularEnsembleIdent.fromString(id)];
            }
            if (DeltaEnsembleIdent.isValidEnsembleIdentString(id)) {
                return [DeltaEnsembleIdent.fromString(id)];
            }
            return [];
        });
    }, [ensembleIdentStringsFromChannels, ensembleSet]);

    const allParameterIdents = getContinuousAndNonConstantParameterIdentsInEnsembles(
        ensembleSet,
        ensembleIdentsFromChannels,
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
                    allParameterIdents={allParameterIdents}
                    selectedParameterIdents={parameterIdents}
                    onChange={handleParametersChanged}
                />
            </CollapsibleGroup>
        </div>
    );
}
