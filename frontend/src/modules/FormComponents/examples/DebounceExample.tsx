import React from "react";

import { DebouncedField } from "@lib/components/@next/DebouncedField/debouncedField";
import { Input } from "@lib/components/@next/Input";

import { ValueResult } from "../ValueResult";

export function DebounceExample(): React.ReactNode {
    const [inputValue, setInputValue] = React.useState<string | undefined>("Foo");
    const [immediateInputValue, setImmediateInputValue] = React.useState<string | undefined>("Foo");

    return (
        <>
            <div>
                <DebouncedField
                    value={inputValue}
                    flushOnBlur
                    debounceTimeMs={1000}
                    onValueChange={setInputValue}
                    onImmediateValueChange={setImmediateInputValue}
                >
                    <Input placeholder="My placeholder" />
                </DebouncedField>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                Internal value: <ValueResult>{immediateInputValue}</ValueResult>
                External value: <ValueResult>{inputValue}</ValueResult>
            </div>
        </>
    );
}
