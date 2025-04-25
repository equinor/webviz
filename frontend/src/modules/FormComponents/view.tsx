import type React from "react";

import type { ModuleViewProps } from "@framework/Module";

import { DebounceExample } from "./examples/DebounceExample";
import { InputExample } from "./examples/InputExample";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function View(props: ModuleViewProps<object>): React.ReactNode {
    return (
        <>
            <p>This is a general overview of different form components we use in webviz</p>
            <div className="mt-6 grid grid-cols-2 gap-2 gap-y-6 ">
                <p className="font-bold">Form element</p>
                <p className="font-bold">Value</p>

                <InputExample />

                <DebounceExample />
            </div>
        </>
    );
}

View.displayName = "View";
