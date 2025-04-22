import React from "react";

import type { DataElement, KeyKind, KeyKindToKeyTypeMapping } from "@framework/DataChannelTypes";

import { isEqual } from "lodash";

import type { ChannelContentMetaData } from "../ChannelContent";
import type { ChannelReceiver } from "../ChannelReceiver";
import { ChannelReceiverNotificationTopic } from "../ChannelReceiver";

export interface ChannelReceiverChannelContent<TKeyKinds extends KeyKind[]> {
    idString: string;
    displayName: string;
    dataArray: DataElement<KeyKindToKeyTypeMapping[TKeyKinds[number]]>[];
    metaData: ChannelContentMetaData;
}

export type ChannelReceiverReturnData<TKeyKinds extends KeyKind[]> = {
    readonly idString: string;
    readonly displayName: string;
    readonly isPending: boolean;
    readonly revisionNumber: number;
    readonly channel?: {
        readonly idString: string;
        readonly displayName: string;
        readonly moduleInstanceId: string;
        readonly kindOfKey: KeyKind | string;
        readonly contents: ChannelReceiverChannelContent<TKeyKinds>[];
    };
};

export function useChannelReceiver<TKeyKinds extends KeyKind[]>(
    receiver: ChannelReceiver,
    expectedKindsOfKeys: TKeyKinds,
): ChannelReceiverReturnData<typeof expectedKindsOfKeys> {
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
                            ", ",
                        )}'`,
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
                ChannelReceiverNotificationTopic.CONTENTS_DATA_ARRAY_CHANGE,
                handleContentsDataArrayOrChannelChange,
            );

            const unsubscribeFromCurrentChannelFunc = receiver?.subscribe(
                ChannelReceiverNotificationTopic.CHANNEL_CHANGE,
                handleContentsDataArrayOrChannelChange,
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
        [receiver, prevExpectedKindsOfKeys],
    );

    if (!receiver) {
        return {
            idString: "",
            displayName: "",
            isPending,
            revisionNumber,
            channel: undefined,
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
    };
}
