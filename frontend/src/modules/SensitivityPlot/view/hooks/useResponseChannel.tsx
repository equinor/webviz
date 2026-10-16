import { Input } from "@mui/icons-material";

import type { ViewContext } from "@framework/ModuleContext";
import { KeyKind } from "@framework/types/dataChannnel";
import { WorkbenchSessionTopic, type WorkbenchSession } from "@framework/WorkbenchSession";
import { Tag } from "@lib/components/Tag";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { ContentWarning } from "@modules/_shared/components/ContentMessage";
import type { Interfaces } from "@modules/SensitivityPlot/interfaces";

import { channelContentsToResponses, type ChannelResponse } from "../utils/channelContentsToResponses";

export interface ResponseChannelData {
    responses: ChannelResponse[];
    warningContent: React.ReactNode | null;
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
            responses: [],
            warningContent: (
                <ContentWarning>
                    <span>
                        Data channel required for use. Add a main module to the workbench and use the data channels icon
                        <Input />
                    </span>
                    <Tag label="Response" />
                </ContentWarning>
            ),
        };
    }
    const hasChannelContents = hasChannel && responseReceiver.channel!.contents.length > 0;

    if (!hasChannelContents) {
        return {
            responses: [],
            warningContent: (
                <ContentWarning>
                    No data received on channel {responseReceiver.channel?.displayName ?? "Unknown"}
                </ContentWarning>
            ),
        };
    }

    const { responses, invalidEnsemble } = channelContentsToResponses(responseReceiver.channel!.contents, ensembleSet);

    if (invalidEnsemble) {
        return {
            responses: [],
            warningContent: (
                <ContentWarning>
                    <p>{invalidEnsemble === "missing" ? "Invalid" : "Delta"} ensemble detected in data channel.</p>
                    <p>Unable to compute sensitivity responses.</p>
                </ContentWarning>
            ),
        };
    }

    return {
        responses,
        warningContent: null,
    };
}
