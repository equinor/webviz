import { KeyKind } from "@framework/DataChannelTypes";
import type { ViewContext } from "@framework/ModuleContext";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { WorkbenchSessionTopic, type WorkbenchSession } from "@framework/WorkbenchSession";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import type { Interfaces } from "@modules/SensitivityPlot/interfaces";

export interface EnsembleResponse {
    realizations: number[];
    values: number[];
    name: string;
    unit: string;
}
export interface ResponseChannelData {
    ensembleResponse: EnsembleResponse | null;
    channelEnsemble: RegularEnsemble | null;
    displayName: string | null;
    hasChannel: boolean;
    hasChannelContents: boolean;
}

export function useResponseChannel(
    viewContext: ViewContext<Interfaces>,
    workbenchSession: WorkbenchSession,
): ResponseChannelData {
    const ensembleSet = usePublishSubscribeTopicValue(workbenchSession, WorkbenchSessionTopic.ENSEMBLE_SET);

    const responseReceiver = viewContext.useChannelReceiver({
        receiverIdString: "response",
        expectedKindsOfKeys: [KeyKind.REALIZATION],
    });

    const hasChannel = !!responseReceiver.channel;
    const hasChannelContents = hasChannel && responseReceiver.channel!.contents.length > 0;

    if (!hasChannelContents) {
        return {
            ensembleResponse: null,
            channelEnsemble: null,
            displayName: responseReceiver.channel?.displayName ?? null,
            hasChannel,
            hasChannelContents,
        };
    }

    const content = responseReceiver.channel!.contents[0];
    const realizations: number[] = [];
    const values: number[] = [];

    content.dataArray?.forEach((el) => {
        realizations.push(el.key as number);
        values.push(el.value as number);
    });

    let channelEnsemble: RegularEnsemble | null = null;
    if (content.metaData.ensembleIdentString) {
        const ensembleIdent = RegularEnsembleIdent.fromString(content.metaData.ensembleIdentString);
        channelEnsemble = ensembleSet.findEnsemble(ensembleIdent);
    }
    const ensembleResponse = {
        realizations,
        values,
        name: content.displayName,
        unit: "",
    };

    return {
        ensembleResponse,
        channelEnsemble,
        displayName: responseReceiver.channel?.displayName ?? null,
        hasChannel,
        hasChannelContents,
    };
}
