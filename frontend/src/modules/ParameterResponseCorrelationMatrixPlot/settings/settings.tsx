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
import { MAX_LABELS, PlotType } from "../typesAndEnums";

import {
    parameterIdentsAtom,
    plotTypeAtom,
    showLabelsAtom,
    showSelfCorrelationAtom,
    useFixedColorRangeAtom,
} from "./atoms/baseAtoms";
import { ParametersSelector } from "./components/parameterSelector";

const plotTypes = [
    {
        value: PlotType.FullMatrix,
        label: "Full matrix",
    },
    {
        value: PlotType.ParameterResponseMatrix,
        label: "Parameter vs. response matrix",
    },
];


export function Settings({ initialSettings, settingsContext, workbenchSession }: ModuleSettingsProps<Interfaces>) {
    const [parameterIdents, setParameterIdents] = useAtom(parameterIdentsAtom);
    const [plotType, setPlotType] = useAtom(plotTypeAtom);
    const [showLabels, setShowLabels] = useAtom(showLabelsAtom);
    const [showSelfCorrelation, setShowSelfCorrelation] = useAtom(showSelfCorrelationAtom);
    const [useFixedColorRange, setUseFixedColorRange] = useAtom(useFixedColorRangeAtom);

    useApplyInitialSettingsToState(initialSettings, "parameterIdentStrings", "array", setParameterIdents);
    useApplyInitialSettingsToState(initialSettings, "showLabels", "boolean", setShowLabels);

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
    function handleShowLabelsChanged(value: boolean) {
        if (value && parameterIdents.length > MAX_LABELS) {
            setShowLabels(false);
        } else {
            setShowLabels(value);
        }
    }
    function handlePlotTypeChanged(value: string) {
        setPlotType(value as PlotType);
    }
    return (
        <div className="flex flex-col gap-2">
            <CollapsibleGroup title="Plot settings" expanded>
                <div className="flex flex-col gap-2">
                    <Label text="Matrix type">
                        <RadioGroup
                            value={plotType as string}
                            options={plotTypes}
                            onChange={(e) => handlePlotTypeChanged(e.target.value)}
                        />
                    </Label>

                    <Checkbox
                        label={`Show parameter labels (Max ${MAX_LABELS})`}
                        checked={showLabels}
                        disabled={parameterIdents.length > MAX_LABELS}
                        onChange={(e) => handleShowLabelsChanged(e.target.checked)}
                    />
                    <Checkbox
                        label="Show self-correlation"
                        checked={showSelfCorrelation}
                        onChange={(e) => setShowSelfCorrelation(e.target.checked)}
                    />
                    <Checkbox
                        label="Use fixed color range (-1 / 1)"
                        checked={useFixedColorRange}
                        onChange={(e) => setUseFixedColorRange(e.target.checked)}
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
