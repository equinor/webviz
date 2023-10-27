import React from "react";

import { ModuleFCProps } from "@framework/Module";

import { State } from "./state";

export const view = (props: ModuleFCProps<State>) => {
    const ref = React.useRef<HTMLDivElement>(null);

    return (
        <div ref={ref} className="w-full h-full">
            View
        </div>
    );
};
