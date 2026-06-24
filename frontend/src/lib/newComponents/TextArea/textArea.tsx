import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { resolveWrapperProps, type ComponentWrapperProps } from "../_shared/utils/wrapperProps";

export type TextAreaProps = {
    /** Called with the new string value whenever the textarea content changes. */
    onValueChange?: (value: string) => void;
    /** Optional element rendered below the textarea, aligned to the right. */
    bottomAdornment?: React.ReactNode;
} & ComponentWrapperProps<React.TextareaHTMLAttributes<HTMLTextAreaElement>>;

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
            data-disabled={props.disabled ? "" : undefined}
            data-readonly={props.readOnly ? "" : undefined}
            className={resolveClassNames(
                props.layoutClassName,
                "form-element",
                "w-full",
                "text-neutral",
                "text-body-md",
                "gap-y-2xs flex flex-col",
                "resize-y",
                "overflow-y-hidden",
                "overflow-x-clip",
                {
                    "min-h-10": !bottomAdornment,
                    "min-h-16": !!bottomAdornment,
                },
            )}
        >
            <textarea
                {...baseProps}
                onChange={handleChange}
                ref={ref}
                className="px-sm py-xs text-body-md min-h-0 w-full grow resize-none bg-transparent outline-0"
            />
            {bottomAdornment && <span className="px-sm pb-4xs w-full text-right">{bottomAdornment}</span>}
        </div>
    );
});
