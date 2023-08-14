import { ModuleFCProps } from "@framework/Module";

import { State } from "./state";

export const view = (props: ModuleFCProps<State>) => {
    const count = props.moduleContext.useStoreValue("count");

    return (
        <div>
            <h3>Count: {count}</h3>
        </div>
    );
};
