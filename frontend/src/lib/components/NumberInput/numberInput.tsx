import React from "react";

import type {
    NumberFieldInputProps as NumberFieldInputBaseProps,
    NumberFieldRootProps as NumberFieldRootBaseProps,
} from "@base-ui/react/number-field";
import { NumberField as NumberFieldBase } from "@base-ui/react/number-field";

import { useFieldStateDataAttributes } from "@lib/components/Field";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { BrowseButtons } from "../_shared/components/browseButtons";
import { useComponentSize } from "../_shared/contexts/componentSizeContext";
import { SELECTABLE_SIZES_CLASSNAMES, type SelectableSize } from "../_shared/utils/size";
import { withDefaults } from "../_shared/utils/defaultProps";
import { resolveWrapperProps, type ComponentWrapperProps } from "../_shared/utils/wrapperProps";

export type NumberInputProps = ComponentWrapperProps<NumberFieldRootBaseProps> & {
    /** Element placed in a draggable scrub area for adjusting the value by dragging. */
    scrubAdornment?: React.ReactNode;
    /** Element rendered at the leading end of the input. */
    startAdornment?: React.ReactNode;
    /** Element rendered at the trailing end of the input, before the increment/decrement buttons. */
    endAdornment?: React.ReactNode;
    /** Size of the input. @default "default" */
    size?: SelectableSize;
    /** Which side the scrub area is placed on. @default "start" */
    scrubAreaPosition?: "start" | "end";
    /** Placeholder text shown when the input is empty. @default "Enter a number..." */
    placeholder?: NumberFieldInputBaseProps["placeholder"];
};

const DEFAULT_PROPS = {
    scrubAreaPosition: "start",
    placeholder: "Enter a number...",
} satisfies Partial<NumberInputProps>;

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(props, ref) {
    const defaultedProps = withDefaults(props, DEFAULT_PROPS);
    const size = useComponentSize(defaultedProps);
    const fieldStateAttrs = useFieldStateDataAttributes();
    const baseProps = resolveWrapperProps(
        defaultedProps,
        "scrubAdornment",
        "startAdornment",
        "endAdornment",
        "scrubAreaPosition",
        "placeholder",
        "size",
    );

    const wrappedScrubAdornment = makeScrubAdornment(defaultedProps.scrubAdornment);

    return (
        <NumberFieldBase.Root
            {...baseProps}
            {...fieldStateAttrs}
            data-readonly={props.readOnly ? "" : undefined}
            className={resolveClassNames(
                baseProps.className,
                "form-element",
                "bg-canvas grow",
                "px-xs gap-xs flex items-center",
                SELECTABLE_SIZES_CLASSNAMES[size],
            )}
            render={
                <NumberFieldBase.Group>
                    {defaultedProps.startAdornment}
                    {defaultedProps.scrubAreaPosition === "start" && wrappedScrubAdornment}

                    <NumberFieldBase.Input
                        ref={ref}
                        className="py-3xs w-full min-w-0 grow self-stretch outline-0 data-disabled:cursor-not-allowed"
                        placeholder={defaultedProps.placeholder}
                    />

                    {defaultedProps.scrubAreaPosition === "end" && wrappedScrubAdornment}
                    {defaultedProps.endAdornment}

                    <BrowseButtons
                        size={size}
                        disabled={defaultedProps.disabled || defaultedProps.readOnly}
                        prevTitle="Increase"
                        nextTitle="Decrease"
                        renderPrev={<NumberFieldBase.Increment />}
                        renderNext={<NumberFieldBase.Decrement />}
                    />
                </NumberFieldBase.Group>
            }
        ></NumberFieldBase.Root>
    );
});

function makeScrubAdornment(scrubAdornment: React.ReactNode): React.ReactNode {
    const wrapperClassName =
        "flex items-center justify-center text-accent" +
        // Adding a bit of padding and negative margin here to make it easier to hit the scrub area without icon
        // ! Padding matches the gap.
        " -mx-xs px-xs aspect-square";

    if (!scrubAdornment) return null;

    return (
        <NumberFieldBase.ScrubArea
            className={(state) => {
                if (state.disabled) return wrapperClassName;
                return `${wrapperClassName} cursor-ew-resize`;
            }}
        >
            {scrubAdornment}
            <NumberFieldBase.ScrubAreaCursor className="z-9999 drop-shadow-[0_1px_1px_#0008] filter">
                <CursorGrowIcon />
            </NumberFieldBase.ScrubAreaCursor>
        </NumberFieldBase.ScrubArea>
    );
}

function CursorGrowIcon(props: React.ComponentProps<"svg">) {
    return (
        <svg
            width="26"
            height="14"
            viewBox="0 0 24 14"
            fill="black"
            stroke="white"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <path d="M19.5 5.5L6.49737 5.51844V2L1 6.9999L6.5 12L6.49737 8.5L19.5 8.5V12L25 6.9999L19.5 2V5.5Z" />
        </svg>
    );
}
