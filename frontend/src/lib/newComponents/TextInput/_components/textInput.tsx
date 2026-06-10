import React from "react";

import type { HTMLProps, InputProps as InputBaseProps, InputState } from "@base-ui/react";
import { Input } from "@base-ui/react";
import { Error } from "@mui/icons-material";

import { useFieldStateDataAttributes } from "@lib/newComponents/Field";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useComponentSize } from "../../_shared/contexts/componentSizeContext";
import type { SelectableSize } from "../../_shared/utils/size";
import { SELECTABLE_SIZES_CLASSNAMES } from "../../_shared/utils/size";
import { resolveWrapperProps, type ComponentWrapperProps } from "../../_shared/utils/wrapperProps";

export type TextInputProps = ComponentWrapperProps<Omit<InputBaseProps, "ref" | "size" | "type">> & {
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
    size?: SelectableSize;
    inputSize?: InputBaseProps["size"];
    type?: Exclude<InputBaseProps["type"], "number">;
};

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(function TextInput(props, ref) {
    const { inputSize, layoutClassName, ...rest } = props;
    const baseProps = resolveWrapperProps(rest, "startAdornment", "endAdornment", "size");

    const size = useComponentSize(props);
    const fieldStateAttrs = useFieldStateDataAttributes();

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
                    {...fieldStateAttrs}
                    {...extractDataProps(inputProps)}
                    className={resolveClassNames(
                        layoutClassName,
                        "form-element",
                        "w-full",
                        "pl-sm",
                        "gap-y-xs flex items-center",
                        "text-neutral-strong",
                        SELECTABLE_SIZES_CLASSNAMES[size],
                        size === "small" ? "pr-3xs" : "pr-sm",
                    )}
                >
                    {makeStartAdornment(state)}
                    <input
                        {...inputProps}
                        className="text-neutral-strong w-full min-w-0 flex-auto border-0 bg-transparent p-0 outline-0 data-disabled:cursor-not-allowed"
                        size={inputSize}
                    />
                    {props.endAdornment}
                </div>
            )}
        />
    );
});
