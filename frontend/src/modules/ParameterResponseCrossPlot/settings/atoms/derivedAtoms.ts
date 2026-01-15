import { atom } from "jotai";

import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
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

    // Get ensemble identifiers
    const ensembleSet = get(EnsembleSetAtom);
    const ensembleIdents = ensembleIdentStrings
        .map((id) => ensembleSet.findEnsembleByIdentString(id))
        .filter(
            (ensemble): ensemble is RegularEnsemble | DeltaEnsemble =>
                ensemble instanceof RegularEnsemble || ensemble instanceof DeltaEnsemble,
        )
        .map((ensemble) => {
            if (ensemble instanceof RegularEnsemble) {
                return RegularEnsembleIdent.fromString(ensemble.getIdent().toString());
            }
            return DeltaEnsembleIdent.fromString(ensemble.getIdent().toString());
        });
    return getContinuousAndNonConstantParameterIdentsInEnsembles(ensembleSet, ensembleIdents);
});
