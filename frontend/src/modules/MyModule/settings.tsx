import React from "react";

import { ModuleFCProps } from "@framework/Module";
import { Button } from "@lib/components/Button";

import { State } from "./state";

export const settings = (props: ModuleFCProps<State>) => {
    const setCount = props.moduleContext.useSetStoreValue("count");

    return (
        <div className="flex flex-col gap-4">
            <Button onClick={() => setCount((prev: number) => prev + 1)}>Count</Button>
        </div>
    );
};
