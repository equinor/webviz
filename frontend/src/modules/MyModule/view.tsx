import { ModuleFCProps } from "@framework/Module";

import { State } from "./state";

export const view = (props: ModuleFCProps<State>) => {
    const count = props.moduleContext.useStoreValue("count");

    if (count === 1) {
        throw new Error("Big fat implementation error");
    }

    return (
        <div>
            <h3>Count: {count}</h3>
        </div>
    );
};
