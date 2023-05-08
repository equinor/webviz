import React from "react";

import { ModuleFCProps } from "@framework/Module";

import { broadcastChannels } from "./broadcastChannel";
import { State } from "./state";

export const view = (props: ModuleFCProps<State, typeof broadcastChannels>) => {
    const count = props.moduleContext.useStoreValue("count");

    React.useEffect(() => {
        props.moduleContext.getChannel("MyModule").broadcast({
            count: count,
        });
    }, [count]);

    return (
        <div>
            <h3>Count: {count}</h3>
        </div>
    );
};
