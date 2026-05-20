import React from "react";

import type { HTMLProps, InputProps as InputBaseProps, InputState } from "@base-ui/react";
import { Input } from "@base-ui/react";
import { Error } from "@mui/icons-material";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { SelectableSize } from "../_shared/size";
import { SELECTABLE_SIZES_CLASSNAMES } from "../_shared/size";
import { resolveWrapperProps, type ComponentWrapperProps } from "../_shared/wrapperProps";

export type TextInputProps = ComponentWrapperProps<Omit<InputBaseProps, "ref" | "size" | "type">> & {
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
    size?: SelectableSize;
    inputSize?: InputBaseProps["size"];
    type?: Exclude<InputBaseProps["type"], "number">;
};

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(function TextInput(props, ref) {
    const { size = "default", inputSize, ...rest } = props;
    const baseProps = resolveWrapperProps(rest, "startAdornment", "endAdornment");

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
            render={(inputProps, state) => (
                <div
                    {...extractDataProps(inputProps)}
                    className={resolveClassNames(
                        props.layoutClassName,
                        "form-element",
                        "w-full",
                        "pl-horizontal-sm",
                        size === "small" ? "pr-horizontal-3xs" : "pr-horizontal-sm",
                        SELECTABLE_SIZES_CLASSNAMES[size],
                        "gap-vertical-xs flex items-center",
                        "text-neutral-strong",
                    )}
                >
                    {makeStartAdornment(state)}
                    <input
                        className="text-neutral-strong w-full min-w-0 flex-auto p-0 outline-0 data-disabled:cursor-not-allowed"
                        {...inputProps}
                        size={inputSize}
                    />
                    {props.endAdornment}
                </div>
            )}
        />
    );
});
