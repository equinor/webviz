import React from "react";

import { useAtom } from "jotai";

import { KeyKind } from "@framework/DataChannelTypes";
import { useApplyInitialSettingsToState } from "@framework/InitialSettings";
import type { ModuleSettingsProps } from "@framework/Module";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Label } from "@lib/components/Label";
import { getContinuousAndNonConstantParameterIdentsInEnsembles } from "@modules/_shared/parameterUnions";

import type { Interfaces } from "../interfaces";

import {
    parameterIdentStringsAtom,
    showLabelsAtom,
    showSelfCorrelationAtom,
    useFixedColorRangeAtom,
} from "./atoms/baseAtoms";
import ParametersSelector from "./components/parameterSelector";

export function Settings({ initialSettings, settingsContext, workbenchSession }: ModuleSettingsProps<Interfaces>) {
    const [parameterIdentStrings, setParameterIdentStrings] = useAtom(parameterIdentStringsAtom);
    const [showLabels, setShowLabels] = useAtom(showLabelsAtom);
    const [showSelfCorrelation, setShowSelfCorrelation] = useAtom(showSelfCorrelationAtom);
    const [useFixedColorRange, setUseFixedColorRange] = useAtom(useFixedColorRangeAtom);

    useApplyInitialSettingsToState(initialSettings, "parameterIdentStrings", "array", setParameterIdentStrings);
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

    const allAvailableParameterObjects = getContinuousAndNonConstantParameterIdentsInEnsembles(
        ensembleSet,
        regularEnsembleIdentsFromChannels,
    );

    const allParameterIdentStringsForSelector: string[] = React.useMemo(() => {
        return allAvailableParameterObjects.map((p) => p.toString());
    }, [allAvailableParameterObjects]);

    function handleParametersChanged(value: string[]) {
        setParameterIdentStrings(value);
    }

    return (
        <div className="flex flex-col gap-2">
            <CollapsibleGroup title="Plot settings" expanded>
                <div className="flex flex-col gap-2">
                    <Label text="Show parameter labels (Max 50)" position="left" key="show-labels">
                        <Checkbox checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} />
                    </Label>
                    <Label text="Show self-correlation" position="left">
                        <Checkbox
                            checked={showSelfCorrelation}
                            onChange={(e) => setShowSelfCorrelation(e.target.checked)}
                        />
                    </Label>
                    <Label text="Use fixed color range (-1 / 1)" position="left">
                        <Checkbox
                            checked={useFixedColorRange}
                            onChange={(e) => setUseFixedColorRange(e.target.checked)}
                        />
                    </Label>
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup title="Parameter selection" expanded>
                <ParametersSelector
                    allParameterIdentStrings={allParameterIdentStringsForSelector}
                    selectedParameterStrings={parameterIdentStrings}
                    onChange={handleParametersChanged}
                />
            </CollapsibleGroup>
        </div>
    );
}
