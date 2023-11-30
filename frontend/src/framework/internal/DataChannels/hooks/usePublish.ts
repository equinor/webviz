import React from "react";

import { isEqual } from "lodash";

import { Data, Genre, GenreType, Type } from "../../../DataChannelTypes";
import { Channel } from "../Channel";
import { ContentDefinition } from "../Content";

export function usePublish<
    TGenre extends Genre,
    TContentType extends Type,
    TMetaData extends Record<string, Type> | undefined
>(options: {
    channel: Channel<TGenre, TContentType, TMetaData>;
    dependencies: any[];
    contents: ContentDefinition[];
    dataGenerator: (
        contentIdent: string
    ) => TMetaData extends undefined
        ? Data<GenreType[TGenre], TContentType>[]
        : { data: Data<GenreType[TGenre], TContentType>[]; metaData: TMetaData };
}) {
    const [prevDependencies, setPrevDependencies] = React.useState<any[]>([]);

    if (!isEqual(prevDependencies, options.dependencies)) {
        setPrevDependencies(options.dependencies);

        for (const oldContent of options.channel.getContents()) {
            if (!options.contents.some((p) => p.ident === oldContent.getIdent())) {
                options.channel.unregisterContent(oldContent.getIdent());
            }
        }
        for (const content of options.contents) {
            if (!options.channel.hasContent(content.ident)) {
                options.channel.registerContent(content.ident, content.name, () =>
                    options.dataGenerator(content.ident)
                );
            } else {
                options.channel.getContent(content.ident)?.publish(() => options.dataGenerator(content.ident));
            }
        }
    }
}
