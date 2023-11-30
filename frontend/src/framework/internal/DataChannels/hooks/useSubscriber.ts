import React from "react";

import { Data, Genre, GenreType, Type } from "../../../DataChannelTypes";
import { Subscriber, SubscriberTopic } from "../Subscriber";
import { checkValueIsExpectedType } from "../utils/checkIfValueIsExpectedType";

type TGenre = [Genre.Realization];
type k = GenreType[TGenre[number]];

type t = ReturnType<typeof useSubscriber<[Genre.Realization], Type.Number>>;

export function useSubscriber<TGenre extends readonly Genre[], TContentValueType extends Type>(options: {
    subscriber: Subscriber<TGenre> | null;
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
            dataArray: Data<GenreType[TGenre[number]], TContentValueType>[];
            metaData: Record<string, Type> | undefined;
        }[];
    };
    hasActiveSubscription: boolean;
} {
    const [contents, setContents] = React.useState<
        {
            ident: string;
            name: string;
            dataArray: Data<GenreType[TGenre[number]], TContentValueType>[];
            metaData: Record<string, Type> | undefined;
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
                        dataArray: content.getDataArray() as Data<GenreType[TGenre[number]], TContentValueType>[],
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
