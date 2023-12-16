import React from "react";

import { DataElement, KeyKind, KeyKindToKeyTypeMapping } from "@framework/DataChannelTypes";

import { isEqual } from "lodash";

import { ModuleChannelContentMetaData } from "../ModuleChannelContent";
import { ModuleChannelReceiver, ModuleChannelReceiverNotificationTopic } from "../ModuleChannelReceiver";

export interface ChannelReceiverChannelContent<TKeyKinds extends KeyKind[]> {
    idString: string;
    displayName: string;
    dataArray: DataElement<KeyKindToKeyTypeMapping[TKeyKinds[number]]>[];
    metaData: ModuleChannelContentMetaData;
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
    receiver,
    expectedKindsOfKeys,
}: {
    receiver: ModuleChannelReceiver | null;
    expectedKindsOfKeys: TGenres;
}): ChannelReceiverReturnData<typeof expectedKindsOfKeys> {
    const [contents, setContents] = React.useState<ChannelReceiverChannelContent<typeof expectedKindsOfKeys>[]>([]);
    const [prevExpectedKindsOfKeys, setPrevExpectedKindsOfKeys] = React.useState<TGenres | null>(null);

    React.useEffect(() => {
        function handleContentsDataArrayChange(): void {
            if (!receiver) {
                return;
            }

            const channel = receiver.getChannel();
            if (!channel) {
                return;
            }

            if (isEqual(prevExpectedKindsOfKeys, expectedKindsOfKeys)) {
                return;
            }

            setPrevExpectedKindsOfKeys(expectedKindsOfKeys);

            if (!expectedKindsOfKeys.includes(channel.getKindOfKey())) {
                throw new Error(
                    `Kind of key '${channel.getKindOfKey()}' is not one of the expected genres '${expectedKindsOfKeys.join(
                        ", "
                    )}'`
                );
            }

            const contents = channel
                .getContents()
                .filter((content) => {
                    if (receiver?.getContentIdStrings().includes(content.getIdString())) {
                        return true;
                    }
                    return false;
                })
                .map((content) => {
                    return {
                        idString: content.getIdString(),
                        displayName: content.getDisplayName(),
                        dataArray: content.getDataArray() as DataElement<KeyKindToKeyTypeMapping[TGenres[number]]>[],
                        metaData: content.getMetaData(),
                    };
                });

            setContents(contents ?? []);
        }

        const unsubscribeFunc = receiver?.subscribe(
            ModuleChannelReceiverNotificationTopic.ContentsDataArrayChange,
            handleContentsDataArrayChange
        );

        handleContentsDataArrayChange();

        return () => {
            if (unsubscribeFunc) {
                unsubscribeFunc();
            }
        };
    }, [receiver, expectedKindsOfKeys, prevExpectedKindsOfKeys]);

    if (!receiver) {
        return {
            idString: "",
            displayName: "",
            channel: undefined,
            hasActiveSubscription: false,
        };
    }

    const channel = receiver.getChannel();

    if (!receiver.hasActiveSubscription() || !channel) {
        return {
            idString: receiver.getIdString(),
            displayName: receiver.getDisplayName(),
            channel: undefined,
            hasActiveSubscription: false,
        };
    }

    return {
        idString: receiver.getIdString(),
        displayName: receiver.getDisplayName(),
        channel: {
            idString: channel.getIdString(),
            displayName: channel.getDisplayName(),
            moduleInstanceId: channel.getManager().getModuleInstanceId(),
            kindOfKey: channel.getKindOfKey(),
            contents: contents,
        },
        hasActiveSubscription: true,
    };
}
