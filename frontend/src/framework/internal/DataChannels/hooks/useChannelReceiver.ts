import React from "react";

import { DataElement, KeyKind, KeyKindToKeyTypeMapping } from "@framework/DataChannelTypes";

import { ModuleChannelReceiver, ModuleChannelReceiverNotificationTopic } from "../ModuleChannelReceiver";

export interface ChannelReceiverReturnData<TGenres extends KeyKind[]> {
    idString: string;
    displayName: string;
    channel: {
        idString: string;
        displayName: string;
        moduleInstanceId: string;
        readonly contents: {
            idString: string;
            displayName: string;
            dataArray: DataElement<KeyKindToKeyTypeMapping[TGenres[number]]>[];
            metaData: Record<string, string | number> | undefined;
        }[];
    };
    hasActiveSubscription: boolean;
}

export function useChannelReceiver<TGenres extends KeyKind[]>({
    subscriber,
    expectedKeyKinds,
}: {
    subscriber: ModuleChannelReceiver | null;
    expectedKeyKinds: TGenres;
}): ChannelReceiverReturnData<typeof expectedKeyKinds> {
    const [contents, setContents] = React.useState<
        ChannelReceiverReturnData<typeof expectedKeyKinds>["channel"]["contents"]
    >([]);

    React.useEffect(() => {
        function handleContentsDataArrayChange(): void {
            const channel = subscriber?.getChannel();
            if (!channel) {
                return;
            }

            if (!expectedKeyKinds.includes(channel.getKindOfKey())) {
                throw new Error(
                    `Kind of key '${channel.getKindOfKey()}' is not one of the expected genres '${expectedKeyKinds.join(
                        ", "
                    )}'`
                );
            }

            const contents = channel
                .getContents()
                .filter((content) => {
                    if (subscriber?.getContentIdStrings().includes(content.getIdString())) {
                        return true;
                    }
                    return false;
                })
                .map((content) => {
                    return {
                        idString: content.getIdString(),
                        displayName: content.getDisplayName(),
                        dataArray: content.getDataArray() as DataElement<KeyKindToKeyTypeMapping[TGenres[number]]>[],
                        metaData: content.getMetaData() ?? undefined,
                    };
                });

            setContents(contents ?? []);
        }

        const unsubscribeFunc = subscriber?.subscribe(
            ModuleChannelReceiverNotificationTopic.ContentsDataArrayChange,
            handleContentsDataArrayChange
        );

        handleContentsDataArrayChange();

        return () => {
            if (unsubscribeFunc) {
                unsubscribeFunc();
            }
        };
    }, [subscriber]);

    return {
        idString: subscriber?.getIdString() ?? "",
        displayName: subscriber?.getDisplayName() ?? "",
        channel: {
            idString: subscriber?.getChannel()?.getIdString() ?? "",
            displayName: subscriber?.getChannel()?.getDisplayName() ?? "",
            moduleInstanceId: subscriber?.getManager().getModuleInstanceId() ?? "",
            contents: contents,
        },
        hasActiveSubscription: subscriber?.hasActiveSubscription() ?? false,
    };
}
