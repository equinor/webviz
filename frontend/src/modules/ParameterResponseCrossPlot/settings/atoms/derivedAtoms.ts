import { atom } from "jotai";

import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { getEnsembleIdentsFromStrings } from "@framework/utils/ensembleIdentUtils";
import { getContinuousAndNonConstantParameterIdentsInEnsembles } from "@modules/_shared/parameterUnions";

import { receivedChannelAtom } from "./baseAtoms";

export const availableParameterIdentsAtom = atom((get) => {
    const receivedChannel = get(receivedChannelAtom);
    if (!receivedChannel) {
        return [];
    }
    if (!receivedChannel.channel?.contents) {
        return [];
    }

    // Extract ensemble identifiers from channels with content
    const ensembleIdentStrings = receivedChannel.channel?.contents.map(
        (content) => content.metaData.ensembleIdentString,
    );

    // Get parameters that are continuous and non-constant across the identified ensembles
    const ensembleSet = get(EnsembleSetAtom);
    const ensembleIdents = getEnsembleIdentsFromStrings(ensembleIdentStrings);
    return getContinuousAndNonConstantParameterIdentsInEnsembles(ensembleSet, ensembleIdents);
});
