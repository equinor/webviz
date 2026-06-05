import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { resolveWrapperProps, type ComponentWrapperProps } from "../_shared/utils/wrapperProps";

export type TextAreaProps = {
    onValueChange?: (value: string) => void;
    bottomAdornment?: React.ReactNode;
} & ComponentWrapperProps<Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "className">>;

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(props, ref) {
    const { onValueChange, onChange, bottomAdornment, ...rest } = props;
    const baseProps = resolveWrapperProps(rest);

    const handleChange = React.useCallback(
        function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
            onValueChange?.(event.target.value);
            onChange?.(event);
        },
        [onValueChange, onChange],
    );

    return (
        <div
            className={resolveClassNames(
                props.layoutClassName,
                "form-element",
                "w-full",
                "px-horizontal-sm",
                "py-vertical-xs",
                "text-neutral",
                "text-body-md",
                "gap-y-vertical-xs flex flex-col",
            )}
        >
            <textarea
                {...baseProps}
                onChange={handleChange}
                ref={ref}
                className={resolveClassNames(props.layoutClassName, "m-0 w-full bg-transparent p-0 outline-0")}
            />
            {bottomAdornment && <span className="mr-horizontal-lg w-full text-right">{bottomAdornment}</span>}
        </div>
    );
});
