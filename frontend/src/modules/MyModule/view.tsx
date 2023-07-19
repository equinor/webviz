import React from "react";

import { BroadcastChannelMeta } from "@framework/Broadcaster";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";

import { State } from "./state";

export const view = (props: ModuleFCProps<State>) => {
    const count = props.moduleContext.useStoreValue("count");

    React.useEffect(
        function broadcast() {
            const dataGenerator = (): { key: number; value: number }[] => {
                const data: { key: number; value: number }[] = [{ key: 0, value: count }];
                return data;
            };

            const channelMeta: BroadcastChannelMeta = {
                ensembleIdent: new EnsembleIdent("", ""),
                description: `Count: ${count}`,
                unit: "",
            };

            props.moduleContext.getChannel("Test").broadcast(channelMeta, dataGenerator);
        },
        [count]
    );

    return (
        <div>
            <h3>Count: {count}</h3>
        </div>
    );
};
