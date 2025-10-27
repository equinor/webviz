import { KeyKind } from "@framework/DataChannelTypes";
import type { ViewContext } from "@framework/ModuleContext";
import { RegularEnsemble } from "@framework/RegularEnsemble";
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
export enum ResponseChannelStatus {
    NO_CHANNEL = "NO_CHANNEL",
    EMPTY_CHANNEL = "EMPTY_CHANNEL",
    INVALID_ENSEMBLE = "INVALID_ENSEMBLE",
    VALID_CHANNEL = "VALID_CHANNEL",
}
export interface ResponseChannelData {
    ensembleResponse: EnsembleResponse | null;
    channelEnsemble: RegularEnsemble | null;
    displayName: string | null;
    status: ResponseChannelStatus;
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
    if (!hasChannel) {
        return {
            ensembleResponse: null,
            channelEnsemble: null,
            displayName: null,
            status: ResponseChannelStatus.NO_CHANNEL,
        };
    }
    const hasChannelContents = hasChannel && responseReceiver.channel!.contents.length > 0;

    if (!hasChannelContents) {
        return {
            ensembleResponse: null,
            channelEnsemble: null,
            displayName: responseReceiver.channel?.displayName ?? null,
            status: ResponseChannelStatus.EMPTY_CHANNEL,
        };
    }

    const content = responseReceiver.channel!.contents[0];

    const ensembleIdentString = content.metaData.ensembleIdentString;
    const channelEnsemble = ensembleSet.findEnsembleByIdentString(ensembleIdentString);

    if (!channelEnsemble || !(channelEnsemble instanceof RegularEnsemble)) {
        return {
            ensembleResponse: null,
            channelEnsemble: null,
            displayName: responseReceiver.channel?.displayName ?? null,
            status: ResponseChannelStatus.INVALID_ENSEMBLE,
        };
    }
    const realizations: number[] = [];
    const values: number[] = [];

    content.dataArray?.forEach((el) => {
        realizations.push(el.key as number);
        values.push(el.value as number);
    });
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
        status: ResponseChannelStatus.VALID_CHANNEL,
    };
}
