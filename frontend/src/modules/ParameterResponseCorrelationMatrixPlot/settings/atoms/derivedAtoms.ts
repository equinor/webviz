import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { getContinuousAndNonConstantParameterIdentsInEnsembles } from "@modules/_shared/parameterUnions";
import { atom } from "jotai";

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
        .map((id) => ensembleSet.findEnsembleByIdentString(id))
        .filter((ensemble) => ensemble instanceof RegularEnsemble)
        .map((ensemble) => RegularEnsembleIdent.fromString(ensemble.getIdent().toString()));
    return getContinuousAndNonConstantParameterIdentsInEnsembles(ensembleSet, regularEnsembleIdents);
});
