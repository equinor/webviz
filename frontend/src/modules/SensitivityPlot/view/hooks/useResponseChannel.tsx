import { Input } from "@mui/icons-material";

import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import type { ViewContext } from "@framework/ModuleContext";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import { KeyKind } from "@framework/types/dataChannnel";
import { WorkbenchSessionTopic, type WorkbenchSession } from "@framework/WorkbenchSession";
import { Tag } from "@lib/components/Tag";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { ContentWarning } from "@modules/_shared/components/ContentMessage";
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
            ensembleResponse: null,
            channelEnsemble: null,
            displayName: null,
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
            ensembleResponse: null,
            channelEnsemble: null,
            displayName: responseReceiver.channel?.displayName ?? null,
            warningContent: (
                <ContentWarning>
                    No data received on channel {responseReceiver.channel?.displayName ?? "Unknown"}
                </ContentWarning>
            ),
        };
    }

    const content = responseReceiver.channel!.contents[0];

    const ensembleIdentString = content.metaData.ensembleIdentString;
    const channelEnsemble = ensembleSet.findEnsembleByIdentString(ensembleIdentString);

    if (!channelEnsemble || channelEnsemble instanceof DeltaEnsemble) {
        const ensembleType = !channelEnsemble ? "Invalid" : "Delta";
        return {
            ensembleResponse: null,
            channelEnsemble: null,
            displayName: responseReceiver.channel?.displayName ?? null,
            warningContent: (
                <ContentWarning>
                    <p>{ensembleType} ensemble detected in data channel.</p>
                    <p>Unable to compute sensitivity responses.</p>
                </ContentWarning>
            ),
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
        warningContent: null,
    };
}
