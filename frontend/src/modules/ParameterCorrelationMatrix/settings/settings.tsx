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

import { parameterIdentStringsAtom } from "./atoms/baseAtoms";

//-----------------------------------------------------------------------------------------------------------
export function Settings({
    initialSettings,
    settingsContext,
    workbenchSession,
    workbenchServices,
}: ModuleSettingsProps<Interfaces>) {
    const [parameterIdentStrings, setParameterIdentStrings] = useAtom(parameterIdentStringsAtom);

    useApplyInitialSettingsToState(initialSettings, "parameterIdentStrings", "string", setParameterIdentStrings);

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

    function handleParametersChanged(value: string[]) {
        setParameterIdentStrings(value);
    }
    const parameterOptions = parameterIdents.map((parameterIdent) => ({
        value: parameterIdent.toString(),
        label: `${parameterIdent.name} (${parameterIdent.groupName})`,
    }));

    return (
        <div className="flex flex-col gap-2">
            <CollapsibleGroup title="Parameter selection" expanded>
                <Select
                    value={parameterIdentStrings}
                    onChange={handleParametersChanged}
                    options={parameterOptions}
                    multiple={true}
                    size={40}
                    filter
                />
            </CollapsibleGroup>
        </div>
    );
}
