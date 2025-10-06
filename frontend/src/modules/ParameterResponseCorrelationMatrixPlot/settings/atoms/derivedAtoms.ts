import type { ParameterIdent } from "@framework/EnsembleParameters";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { getContinuousAndNonConstantParameterIdentsInEnsembles } from "@modules/_shared/parameterUnions";
import { atom } from "jotai";

import {
    receivedChannelAtom,
    userSelectedParameterIdentsAtom,
    hasUserInteractedWithParameterSelectionAtom,
} from "./baseAtoms";

export const availableParameterIdentsAtom = atom((get) => {
    const receivedChannels = get(receivedChannelAtom);
    if (!receivedChannels) {
        return [];
    }

    // Filter for channels that have content
    const channelsWithContent = receivedChannels.filter((response) => response.channel?.contents);
    if (!channelsWithContent.length) {
        return [];
    }

    // Extract ensemble identifiers from channels with content
    const ensembleIdentStrings = channelsWithContent
        .flatMap((channel) => channel.channel?.contents || [])
        .map((content) => content.metaData.ensembleIdentString);

    // Get regular ensemble identifiers
    const ensembleSet = get(EnsembleSetAtom);
    const regularEnsembleIdents = ensembleIdentStrings
        .map((id) => ensembleSet.findEnsembleByIdentString(id))
        .filter((ensemble) => ensemble instanceof RegularEnsemble)
        .map((ensemble) => RegularEnsembleIdent.fromString(ensemble.getIdent().toString()));
    return getContinuousAndNonConstantParameterIdentsInEnsembles(ensembleSet, regularEnsembleIdents);
});

export const selectedParameterIdentsAtom = atom((get) => {
    const availableParameterIdents = get(availableParameterIdentsAtom);
    const userParameterIdents: ParameterIdent[] = get(userSelectedParameterIdentsAtom);
    const hasUserInteracted = get(hasUserInteractedWithParameterSelectionAtom);
    const MAX_INITIAL_SELECTED_PARAMETERS = 100;
    // Ensure that the selected parameters are still available
    const filteredUserParameters = userParameterIdents.filter((param) =>
        availableParameterIdents.some(
            (availableParam) => availableParam.name === param.name && availableParam.groupName === param.groupName,
        ),
    );

    // Only auto-select if user has never interacted with the parameter selection (initial state)
    // Don't auto-select when user has made selections but they became empty through filtering or explicit deselection
    if (!hasUserInteracted && userParameterIdents.length === 0 && availableParameterIdents.length > 0) {
        // If less than MAX_INITIAL_SELECTED_PARAMETERS parameters, select all
        if (availableParameterIdents.length < MAX_INITIAL_SELECTED_PARAMETERS) {
            return availableParameterIdents;
        }

        // If MAX_INITIAL_SELECTED_PARAMETERS or more parameters, select all from the first group name
        const firstGroupName = availableParameterIdents.find((param) => param.groupName !== null)?.groupName;
        if (firstGroupName) {
            return availableParameterIdents.filter((param) => param.groupName === firstGroupName);
        }

        // Fallback: if no groups found, return all parameters without group names
        return availableParameterIdents.filter((param) => param.groupName === null);
    }

    return filteredUserParameters;
});
