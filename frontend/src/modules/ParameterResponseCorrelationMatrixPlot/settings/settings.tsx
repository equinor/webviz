import React from "react";

import { useAtom } from "jotai";

import { KeyKind } from "@framework/DataChannelTypes";
import type { ParameterIdent } from "@framework/EnsembleParameters";
import { useApplyInitialSettingsToState } from "@framework/InitialSettings";
import type { ModuleSettingsProps } from "@framework/Module";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { getContinuousAndNonConstantParameterIdentsInEnsembles } from "@modules/_shared/parameterUnions";

import type { Interfaces } from "../interfaces";
import { PlotType } from "../typesAndEnums";

import {
    correlationSettingsAtom,
    parameterIdentsAtom,
    plotTypeAtom,
    showLabelsAtom,
    useFixedColorRangeAtom,
} from "./atoms/baseAtoms";
import { ParametersSelector } from "./components/parameterSelector";

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

export function Settings({ initialSettings, settingsContext, workbenchSession }: ModuleSettingsProps<Interfaces>) {
    const [parameterIdents, setParameterIdents] = useAtom(parameterIdentsAtom);
    const [plotType, setPlotType] = useAtom(plotTypeAtom);
    const [showLabels, setShowLabels] = useAtom(showLabelsAtom);
    const [useFixedColorRange, setUseFixedColorRange] = useAtom(useFixedColorRangeAtom);
    const [correlationSettings, setCorrelationSettings] = useAtom(correlationSettingsAtom);

    useApplyInitialSettingsToState(initialSettings, "parameterIdents", "array", setParameterIdents);
    useApplyInitialSettingsToState(initialSettings, "showLabels", "boolean", setShowLabels);
    useApplyInitialSettingsToState(initialSettings, "correlationSettings", "object", setCorrelationSettings);
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

    const regularEnsembleIdentsFromChannels: RegularEnsembleIdent[] = React.useMemo(() => {
        return ensembleIdentStringsFromChannels.flatMap((id) => {
            const ensemble = ensembleSet.findEnsembleByIdentString(id);
            return ensemble instanceof RegularEnsemble ? [RegularEnsembleIdent.fromString(id)] : [];
        });
    }, [ensembleIdentStringsFromChannels, ensembleSet]);

    const allParameterIdents = getContinuousAndNonConstantParameterIdentsInEnsembles(
        ensembleSet,
        regularEnsembleIdentsFromChannels,
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
        setCorrelationSettings((prev) => ({
            ...prev,
            threshold,
        }));
    }
    function handleHideIndividualCellsChanged(e: React.ChangeEvent<HTMLInputElement>) {
        setCorrelationSettings((prev) => ({
            ...prev,
            hideIndividualCells: e.target.checked,
        }));
    }
    function handleFilterColumnsChanged(e: React.ChangeEvent<HTMLInputElement>) {
        setCorrelationSettings((prev) => ({
            ...prev,
            filterColumns: e.target.checked,
        }));
    }
    function handleFilterRowsChanged(e: React.ChangeEvent<HTMLInputElement>) {
        setCorrelationSettings((prev) => ({
            ...prev,
            filterRows: e.target.checked,
        }));
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
                            value={correlationSettings.threshold ?? ""}
                            onChange={handleThresholdChanged}
                            className="w-full p-1 border border-gray-300 rounded"
                        />
                    </Label>
                    <Checkbox
                        label="Blank individual cells below cutoff"
                        checked={correlationSettings.hideIndividualCells}
                        onChange={handleHideIndividualCellsChanged}
                    />
                    <Checkbox
                        label="Filter columns below cutoff"
                        checked={correlationSettings.filterColumns}
                        onChange={handleFilterColumnsChanged}
                    />
                    <Checkbox
                        label="Filter rows below cutoff"
                        checked={correlationSettings.filterRows}
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
