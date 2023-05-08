import { ModuleFCProps } from "@framework/Module";
import { Button } from "@lib/components/Button";

import { broadcastChannels } from "./broadcastChannel";
import { State } from "./state";

export const settings = (props: ModuleFCProps<State, typeof broadcastChannels>) => {
    const setCount = props.moduleContext.useSetStoreValue("count");

    return (
        <div>
            <Button onClick={() => setCount((prev: number) => prev + 1)}>Count</Button>
        </div>
    );
};
