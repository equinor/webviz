import React from "react";

import { useAtom } from "jotai";

import { KeyKind } from "@framework/DataChannelTypes";
import { ParameterIdent } from "@framework/EnsembleParameters";
import { useApplyInitialSettingsToState } from "@framework/InitialSettings";
import type { ModuleSettingsProps } from "@framework/Module";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { Select } from "@lib/components/Select";
import { getContinuousAndNonConstantParameterIdentsInEnsembles } from "@modules/_shared/parameterUnions";

import type { Interfaces } from "../interfaces";

import { parameterIdentStringsAtom, showLabelsAtom } from "./atoms/baseAtoms";
import ParametersSelector from "./components/parameterSelector";

//-----------------------------------------------------------------------------------------------------------
export function Settings({
    initialSettings,
    settingsContext,
    workbenchSession,
    workbenchServices,
}: ModuleSettingsProps<Interfaces>) {
    const [parameterIdentStrings, setParameterIdentStrings] = useAtom(parameterIdentStringsAtom);
    const [showLabels, setShowLabels] = useAtom(showLabelsAtom);

    useApplyInitialSettingsToState(initialSettings, "parameterIdentStrings", "string", setParameterIdentStrings);
    useApplyInitialSettingsToState(initialSettings, "showLabels", "boolean", setShowLabels);
    // Need to get the ensemble idents from the channel to get relevant parameters
    const receiverResponse = settingsContext.useChannelReceiver({
        receiverIdString: "channelResponse",
        expectedKindsOfKeys: [KeyKind.REALIZATION],
    });

    let ensembleIdentStringsFromChannels: string[] = [];
    if (!receiverResponse.channel || !receiverResponse.channel.contents) {
        ensembleIdentStringsFromChannels = [];
    } else {
        ensembleIdentStringsFromChannels = receiverResponse.channel.contents.map((content) => {
            return content.metaData.ensembleIdentString;
        });
    }

    const ensembleSet = workbenchSession.getEnsembleSet();

    // The channel could have non-regular ensembles (?)
    const regularEnsembleIdentsFromChannels: RegularEnsembleIdent[] = ensembleIdentStringsFromChannels.flatMap((id) => {
        const ensemble = ensembleSet.findEnsembleByIdentString(id);
        return ensemble instanceof RegularEnsemble ? [RegularEnsembleIdent.fromString(id)] : [];
    });

    const parameterIdents = getContinuousAndNonConstantParameterIdentsInEnsembles(
        ensembleSet,
        regularEnsembleIdentsFromChannels,
    );

    if (ensembleIdentStringsFromChannels.length === 0) {
        return;
    }

    // function handleParametersChanged(value: string[]) {
    //     setParameterIdentStrings(value);
    // }
    const parameterOptions = parameterIdents.map((parameterIdent) => ({
        value: parameterIdent.toString(),
        label: `${parameterIdent.name} (${parameterIdent.groupName})`,
    }));

    function handleParametersChanged(value: string[]) {
        // const selectedParameters = value.map((paramIdent) => {
        //     return parameterIdents.find((p) => p.equals(paramIdent)) || paramIdent;
        // });
        console.log("Selected parameters:", value);
        setParameterIdentStrings(value);
    }
    return (
        <div className="flex flex-col gap-2">
            <CollapsibleGroup title="Plot settings" expanded>
                <Label text="Show parameter labels (Max 50)" position="left" key="show-labels">
                    <Checkbox checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} />
                </Label>
            </CollapsibleGroup>
            <CollapsibleGroup title="Parameter selection" expanded>
                {/* <Select
                    value={parameterIdentStrings}
                    onChange={handleParametersChanged}
                    options={parameterOptions}
                    multiple={true}
                    size={40}
                    filter
                /> */}
                <ParametersSelector
                    parameterIdents={parameterIdents}
                    selectedParameterIdentStrings={parameterIdentStrings}
                    onChange={handleParametersChanged}
                />
            </CollapsibleGroup>
        </div>
    );
}
//-----------------------------------------------------------------------------------------------------------
