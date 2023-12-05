import React from "react";

import { Data, KeyKind, KeyKindToTypeMapping, Type, TypeToTypeScriptTypeMapping } from "../../../DataChannelTypes";
import { Subscriber, SubscriberTopic } from "../Subscriber";
import { checkValueIsExpectedType } from "../utils/checkIfValueIsExpectedType";

type m = KeyKind[];
const s = [KeyKind.Realization] as const;
type n = KeyKindToTypeMapping[(typeof s)[number]];
type l = [KeyKind.Realization];
type k = KeyKindToTypeMapping[l[number]];

export function useSubscriber<TGenres extends KeyKind[], TValueType extends Type>(options: {
    subscriber: Subscriber | null;
    expectedGenres: TGenres;
    expectedValueType: TValueType;
}): {
    ident: string;
    name: string;
    channel: {
        ident: string;
        name: string;
        moduleInstanceId: string;
        readonly contents: {
            ident: string;
            name: string;
            dataArray: Data<
                KeyKindToTypeMapping[(typeof options.expectedGenres)[number]],
                typeof options.expectedValueType
            >[];
            metaData: Record<string, TypeToTypeScriptTypeMapping[Type]> | undefined;
        }[];
    };
    hasActiveSubscription: boolean;
} {
    const [contents, setContents] = React.useState<
        {
            ident: string;
            name: string;
            dataArray: Data<KeyKindToTypeMapping[TGenres[number]], TValueType>[];
            metaData: Record<string, TypeToTypeScriptTypeMapping[Type]> | undefined;
        }[]
    >([]);

    React.useEffect(() => {
        function handleContentChange(): void {
            const channel = options.subscriber?.getChannel();
            if (!channel) {
                return;
            }

            if (!options.expectedGenres.includes(channel.getGenre())) {
                throw new Error(
                    `Genre '${channel.getGenre()}' is not one of the expected genres '${options.expectedGenres.join(
                        ", "
                    )}'`
                );
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
                        dataArray: content.getDataArray() as Data<KeyKindToTypeMapping[TGenres[number]], TValueType>[],
                        metaData: content.getMetaData() ?? undefined,
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
