import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import type { EnsembleSet } from "@framework/EnsembleSet";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { ChannelReceiverChannelContent, KeyKind } from "@framework/types/dataChannnel";
import type { EnsemblePerRealizationResponse } from "@modules/_shared/SensitivityProcessing/types";

export type ChannelResponse = {
    idString: string;
    title: string;
    ensemblePerRealResponse: EnsemblePerRealizationResponse;
    channelEnsemble: RegularEnsemble;
};

export type ChannelContentsToResponsesResult = {
    responses: ChannelResponse[];
    /** Set when any content refers to a missing or delta ensemble; `responses` is then empty. */
    invalidEnsembleType: "Invalid" | "Delta" | null;
};

export function channelContentsToResponses(
    contents: ChannelReceiverChannelContent<KeyKind.REALIZATION[]>[],
    ensembleSet: EnsembleSet,
): ChannelContentsToResponsesResult {
    const responses: ChannelResponse[] = [];

    for (const content of contents) {
        const channelEnsemble = ensembleSet.findEnsembleByIdentString(content.metaData.ensembleIdentString);
        if (!channelEnsemble || channelEnsemble instanceof DeltaEnsemble) {
            return { responses: [], invalidEnsembleType: !channelEnsemble ? "Invalid" : "Delta" };
        }

        const realizations: number[] = [];
        const values: number[] = [];
        for (const element of content.dataArray) {
            realizations.push(element.key);
            values.push(element.value);
        }

        responses.push({
            idString: content.idString,
            title: content.displayName,
            ensemblePerRealResponse: { realizations, values, name: content.displayName, unit: "" },
            channelEnsemble,
        });
    }

    return { responses, invalidEnsembleType: null };
}
