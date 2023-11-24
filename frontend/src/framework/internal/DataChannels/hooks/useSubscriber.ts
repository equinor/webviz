import React from "react";

import { Data, DataType, Type, TypeToTSTypeMapping } from "../../../DataChannelTypes";
import { Subscriber, SubscriberTopic } from "../Subscriber";
import { checkValueIsExpectedType } from "../utils/checkIfValueIsExpectedType";

export function useSubscriber<TContentValueType extends Type>(options: {
    subscriber: Subscriber | null;
    expectedValueType: TContentValueType;
}): {
    ident: string;
    name: string;
    channel: {
        ident: string;
        name: string;
        moduleInstanceId: string;
        contents: {
            ident: string;
            name: string;
            dataArray: Data<TypeToTSTypeMapping[TContentValueType]>[];
            metaData: Record<string, DataType> | undefined;
        }[];
    };
    hasActiveSubscription: boolean;
} {
    const [contents, setContents] = React.useState<
        {
            ident: string;
            name: string;
            dataArray: Data<TypeToTSTypeMapping[TContentValueType]>[];
            metaData: Record<string, DataType> | undefined;
        }[]
    >([]);

    React.useEffect(() => {
        function handleContentChange(): void {
            const channel = options.subscriber?.getChannel();
            if (!channel) {
                return;
            }

            const contents = channel
                .getContents()
                .filter((content) => {
                    if (options.subscriber?.getContentIdents().includes(content.getIdent())) {
                        return true;
                    }
                    return false;
                })
                .map((content) => {
                    const dataArray = content.getDataArray();
                    for (const c of dataArray) {
                        if (!checkValueIsExpectedType(c.value, options.expectedValueType)) {
                            throw new Error(
                                `Value '${c.value}' is not of expected type '${options.expectedValueType}'`
                            );
                        }
                    }
                    return {
                        ident: content.getIdent(),
                        name: content.getName(),
                        dataArray: content.getDataArray() as Data<TypeToTSTypeMapping[TContentValueType]>[],
                        metaData: content.getMetaData(),
                    };
                });

            setContents(contents ?? []);
        }

        const unsubscribeFunc = options.subscriber?.subscribe(SubscriberTopic.ContentChange, handleContentChange);

        handleContentChange();

        return () => {
            if (unsubscribeFunc) {
                unsubscribeFunc();
            }
        };
    }, [options.subscriber]);

    return {
        ident: options.subscriber?.getChannel()?.getIdent() ?? "",
        name: options.subscriber?.getName() ?? "",
        channel: {
            ident: options.subscriber?.getChannel()?.getIdent() ?? "",
            name: options.subscriber?.getChannel()?.getName() ?? "",
            moduleInstanceId: options.subscriber?.getBroker().getModuleInstanceId() ?? "",
            contents: contents,
        },
        hasActiveSubscription: options.subscriber?.hasActiveSubscription() ?? false,
    };
}
