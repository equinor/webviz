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

export type ChannelReceiverReturnData<TKeyKinds extends KeyKind[]> = {
    idString: string;
    displayName: string;
    isPending: boolean;
    revisionNumber: number;
} & (
    | {
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
          channel?: undefined;
          hasActiveSubscription: false;
      }
);

export function useChannelReceiver<TKeyKinds extends KeyKind[]>({
    receiver,
    expectedKindsOfKeys,
}: {
    receiver: ModuleChannelReceiver | null;
    expectedKindsOfKeys: TKeyKinds;
}): ChannelReceiverReturnData<typeof expectedKindsOfKeys> {
    const [isPending, startTransition] = React.useTransition();
    const [contents, setContents] = React.useState<ChannelReceiverChannelContent<typeof expectedKindsOfKeys>[]>([]);
    const [revisionNumber, setRevisionNumber] = React.useState(0);
    const [prevExpectedKindsOfKeys, setPrevExpectedKindsOfKeys] = React.useState<TKeyKinds>(expectedKindsOfKeys);

    if (!isEqual(prevExpectedKindsOfKeys, expectedKindsOfKeys)) {
        setPrevExpectedKindsOfKeys(expectedKindsOfKeys);
    }

    React.useEffect(
        function handleSubscribe() {
            function handleContentsDataArrayOrChannelChange(): void {
                if (!receiver) {
                    return;
                }

                const channel = receiver.getChannel();
                if (!channel) {
                    setContents([]);
                    setRevisionNumber((prev) => prev + 1);
                    return;
                }

                if (!prevExpectedKindsOfKeys.includes(channel.getKindOfKey())) {
                    throw new Error(
                        `Kind of key '${channel.getKindOfKey()}' is not one of the expected kinds of keys '${prevExpectedKindsOfKeys.join(
                            ", "
                        )}'`
                    );
                }

                startTransition(function getDataArray() {
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
                                dataArray: content.getDataArray() as DataElement<
                                    KeyKindToKeyTypeMapping[TKeyKinds[number]]
                                >[],
                                metaData: content.getMetaData(),
                            };
                        });

                    setContents(contents ?? []);
                    setRevisionNumber((prev) => prev + 1);
                });
            }

            const unsubscribeFromContentsChangeFunc = receiver?.subscribe(
                ModuleChannelReceiverNotificationTopic.ContentsDataArrayChange,
                handleContentsDataArrayOrChannelChange
            );

            const unsubscribeFromCurrentChannelFunc = receiver?.subscribe(
                ModuleChannelReceiverNotificationTopic.ChannelChange,
                handleContentsDataArrayOrChannelChange
            );

            handleContentsDataArrayOrChannelChange();

            return () => {
                if (unsubscribeFromContentsChangeFunc) {
                    unsubscribeFromContentsChangeFunc();
                }
                if (unsubscribeFromCurrentChannelFunc) {
                    unsubscribeFromCurrentChannelFunc();
                }
            };
        },
        [receiver, prevExpectedKindsOfKeys]
    );

    if (!receiver) {
        return {
            idString: "",
            displayName: "",
            isPending,
            revisionNumber,
            channel: undefined,
            hasActiveSubscription: false,
        };
    }

    const channel = receiver.getChannel();

    if (!receiver.hasActiveSubscription() || !channel) {
        return {
            idString: receiver.getIdString(),
            displayName: receiver.getDisplayName(),
            isPending,
            revisionNumber,
            channel: undefined,
            hasActiveSubscription: false,
        };
    }

    return {
        idString: receiver.getIdString(),
        displayName: receiver.getDisplayName(),
        isPending,
        revisionNumber,
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
