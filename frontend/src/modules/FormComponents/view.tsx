import type React from "react";

import type { ModuleViewProps } from "@framework/Module";

import { DebounceExample } from "./examples/DebounceExample";
import { InputExample } from "./examples/InputExample";
import { NumberInputExample } from "./examples/NumberInputExample";
import { SliderExample } from "./examples/SliderExample";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function View(props: ModuleViewProps<object>): React.ReactNode {
    return (
        <>
            <p>This is a general overview of different form components we use in webviz</p>
            <div className="mt-6 grid grid-cols-2 gap-2 gap-y-3">
                <p className="font-bold">Form element</p>
                <p className="font-bold">Value</p>

                <InputExample />

                <NumberInputExample />

                <DebounceExample />

                <SliderExample />
            </div>
        </>
    );
}

View.displayName = "View";
