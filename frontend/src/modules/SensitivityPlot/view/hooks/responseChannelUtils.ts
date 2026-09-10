import type { ChannelReceiverChannelContent, KeyKind } from "@framework/types/dataChannnel";
import type { EnsemblePerRealizationResponse } from "@modules/_shared/SensitivityProcessing/types";

export function makeEnsemblePerRealizationResponse(
    content: ChannelReceiverChannelContent<KeyKind[]>,
): EnsemblePerRealizationResponse {
    return {
        realizations: content.dataArray.map((element) => element.key as number),
        values: content.dataArray.map((element) => element.value),
        name: content.displayName,
        unit: content.metaData.unit,
    };
}
