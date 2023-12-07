import React from "react";

import { DataElement, KeyKind, KeyKindToKeyTypeMapping } from "@framework/DataChannelTypes";

import { ModuleChannelReceiver, ModuleChannelReceiverNotificationTopic } from "../ModuleChannelReceiver";

export interface ChannelReceiverChannelContent<TKeyKinds extends KeyKind[]> {
    idString: string;
    displayName: string;
    dataArray: DataElement<KeyKindToKeyTypeMapping[TKeyKinds[number]]>[];
    metaData: Record<string, string | number> | undefined;
}

export type ChannelReceiverReturnData<TKeyKinds extends KeyKind[]> =
    | {
          idString: string;
          displayName: string;
          channel: {
              idString: string;
              displayName: string;
              moduleInstanceId: string;
              kindOfKey: KeyKind | string;
              readonly contents: ChannelReceiverChannelContent<TKeyKinds>[];
          };
          hasActiveSubscription: true;
      }
    | {
          idString: string;
          displayName: string;
          channel?: undefined;
          hasActiveSubscription: false;
      };

export function useChannelReceiver<TGenres extends KeyKind[]>({
    subscriber,
    expectedKeyKinds,
}: {
    subscriber: ModuleChannelReceiver | null;
    expectedKeyKinds: TGenres;
}): ChannelReceiverReturnData<typeof expectedKeyKinds> {
    const [contents, setContents] = React.useState<ChannelReceiverChannelContent<typeof expectedKeyKinds>[]>([]);

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

    if (!subscriber) {
        return {
            idString: "",
            displayName: "",
            channel: undefined,
            hasActiveSubscription: false,
        };
    }

    const channel = subscriber?.getChannel();

    if (!subscriber.hasActiveSubscription() || !channel) {
        return {
            idString: subscriber.getIdString(),
            displayName: subscriber.getDisplayName(),
            channel: undefined,
            hasActiveSubscription: false,
        };
    }

    let channelObject: ChannelReceiverReturnData<typeof expectedKeyKinds>["channel"] | undefined = undefined;

    if (channel) {
        channelObject = {
            idString: channel.getIdString() ?? "",
            displayName: channel.getDisplayName() ?? "",
            moduleInstanceId: channel.getManager().getModuleInstanceId() ?? "",
            kindOfKey: channel.getKindOfKey() ?? "",
            contents: contents,
        };
    }

    return {
        idString: subscriber?.getIdString() ?? "",
        displayName: subscriber?.getDisplayName() ?? "",
        channel: {
            idString: channel.getIdString() ?? "",
            displayName: channel.getDisplayName() ?? "",
            moduleInstanceId: channel.getManager().getModuleInstanceId() ?? "",
            kindOfKey: channel.getKindOfKey() ?? "",
            contents: contents,
        },
        hasActiveSubscription: true,
    };
}
