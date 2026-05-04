import React from "react";

import type { HTMLProps, InputProps as InputBaseProps, InputState } from "@base-ui/react";
import { Input } from "@base-ui/react";
import { Error } from "@mui/icons-material";
import { omit } from "lodash";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type TextInputProps = Omit<InputBaseProps, "className" | "render"> & {
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
};

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(function TextInput(props, ref) {
    const baseProps = omit(props, ["startAdornment", "endAdornment"]);

    function makeStartAdornment(state: InputState) {
        // state.valid is explicitly null when no validity is applied
        if (state.valid === false) {
            return <Error fontSize="inherit" className="fill-text-danger-subtle!" />;
        }
        return props.startAdornment;
    }

    function extractDataProps(p: HTMLProps) {
        const dataAttributes: Record<string, any> = {};

        for (const key in p) {
            if (key.startsWith("data-")) {
                dataAttributes[key] = p[key as keyof typeof p];
            }
        }

        return dataAttributes;
    }

    return (
        <Input
            {...baseProps}
            ref={ref}
            render={(p, state) => (
                <div
                    {...extractDataProps(p)}
                    className={resolveClassNames(
                        "form-element",
                        "py-vertical-xs px-horizontal-sm text-body-md",
                        "gap-vertical-xs flex items-center -outline-offset-2",
                        "bg-canvas",
                        "outline-neutral outline",
                        "text-neutral",
                    )}
                >
                    {makeStartAdornment(state)}
                    <input className="w-full min-w-0 flex-auto p-0 outline-0 data-disabled:cursor-not-allowed" {...p} />
                    {props.endAdornment}
                </div>
            )}
        />
    );
});
