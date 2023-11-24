import React from "react";

import { isEqual } from "lodash";

import { Data, DataType, Genre } from "../../../DataChannelTypes";
import { Channel } from "../Channel";
import { ContentDefinition } from "../Content";

export function usePublish<
    TGenre extends Genre,
    TContentType extends DataType,
    TMetaData extends Record<string, DataType> | undefined
>(options: {
    channel: Channel<TGenre, TContentType, TMetaData>;
    dependencies: any[];
    contents: ContentDefinition[];
    dataGenerator: (
        contentIdent: string
    ) => TMetaData extends undefined ? Data[] : { data: Data[]; metaData: TMetaData };
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
