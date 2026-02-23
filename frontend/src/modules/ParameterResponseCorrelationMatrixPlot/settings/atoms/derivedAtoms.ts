import { atom } from "jotai";

import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { getEnsembleIdentsFromStrings } from "@framework/utils/ensembleIdentUtils";
import { getContinuousAndNonConstantParameterIdentsInEnsembles } from "@modules/_shared/parameterUnions";

import { receivedChannelAtom } from "./baseAtoms";

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

    // Extract ensemble identifier strings from channels with content
    const ensembleIdentStrings = channelsWithContent
        .flatMap((channel) => channel.channel?.contents || [])
        .map((content) => content.metaData.ensembleIdentString);

    // Get union of all continuous and non-constant parameter idents in the identified ensembles
    const ensembleSet = get(EnsembleSetAtom);
    const ensembleIdents = getEnsembleIdentsFromStrings(ensembleIdentStrings);
    return getContinuousAndNonConstantParameterIdentsInEnsembles(ensembleSet, ensembleIdents);
});
