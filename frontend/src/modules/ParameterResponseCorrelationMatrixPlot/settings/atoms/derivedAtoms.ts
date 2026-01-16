import { atom } from "jotai";

import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
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

    // Extract ensemble identifiers from channels with content
    const ensembleIdentStrings = channelsWithContent
        .flatMap((channel) => channel.channel?.contents || [])
        .map((content) => content.metaData.ensembleIdentString);

    // Get regular ensemble identifiers
    const ensembleSet = get(EnsembleSetAtom);
    const regularEnsembleIdents = ensembleIdentStrings
        .filter((id) => RegularEnsembleIdent.isValidEnsembleIdentString(id))
        .map((id) => RegularEnsembleIdent.fromString(id));
    return getContinuousAndNonConstantParameterIdentsInEnsembles(ensembleSet, regularEnsembleIdents);
});
