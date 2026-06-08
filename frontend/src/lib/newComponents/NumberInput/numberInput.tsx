import React from "react";

import type {
    NumberFieldInputProps as NumberFieldInputBaseProps,
    NumberFieldRootProps as NumberFieldRootBaseProps,
} from "@base-ui/react/number-field";
import { NumberField as NumberFieldBase } from "@base-ui/react/number-field";
import { Add, Remove } from "@mui/icons-material";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useComponentSize } from "../_shared/contexts/componentSizeContext";
import { SELECTABLE_SIZES_CLASSNAMES, type SelectableSize } from "../_shared/utils/size";
import { resolveWrapperProps, type ComponentWrapperProps } from "../_shared/utils/wrapperProps";

export type NumberInputProps = ComponentWrapperProps<Omit<NumberFieldRootBaseProps, "className">> & {
    scrubAdornment?: React.ReactNode;
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;

    size?: SelectableSize;

    /**
     * @default "start"
     */
    scrubAreaPosition?: "start" | "end";

    // Exposed parts-props
    placeholder?: NumberFieldInputBaseProps["placeholder"];
};

const DEFAULT_PROPS = {
    scrubAreaPosition: "start",
} satisfies Partial<NumberInputProps>;

function NumberInputComponent(props: NumberInputProps, ref: React.ForwardedRef<HTMLInputElement>): React.ReactNode {
    const defaultedProps = { ...DEFAULT_PROPS, ...props };
    const size = useComponentSize(props);
    const baseRootProps = resolveWrapperProps(
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
            {...baseRootProps}
            className={resolveClassNames(
                props.layoutClassName,
                "form-element",
                "bg-canvas text-body-md",
                "gap-vertical-xs flex items-center pr-0",
                "data-invalid:outline-danger data-invalid:bg-danger-surface",
                SELECTABLE_SIZES_CLASSNAMES[size],
                {
                    "outline-neutral text-neutral-subtle outline -outline-offset-1": !defaultedProps.disabled,
                    "outline-transparent": defaultedProps.disabled,
                    "pr-horizontal-3xs": size === "small",
                    "pr-horizontal-sm": size !== "small",
                },
            )}
        >
            <NumberFieldBase.Group className="gap-vertical-3xs pl-vertical-xs flex min-w-0 grow items-center">
                {defaultedProps.startAdornment}
                {defaultedProps.scrubAreaPosition === "start" && wrappedScrubAdornment}

                <NumberFieldBase.Input
                    className="py-vertical-3xs w-full min-w-0 grow outline-0 data-disabled:cursor-not-allowed"
                    ref={ref}
                    placeholder={defaultedProps.placeholder}
                />

                {defaultedProps.scrubAreaPosition === "end" && wrappedScrubAdornment}
                {defaultedProps.endAdornment}

                <div className="text-body-xs max-h-full shrink-0 flex-col">
                    <NumberFieldBase.Increment className="size-icon-xs not-disabled:hover:bg-accent-hover disabled:text-disabled text-accent-subtle block shrink not-disabled:cursor-pointer">
                        <Add fontSize="inherit" className="h-1/2" />
                    </NumberFieldBase.Increment>
                    <NumberFieldBase.Decrement className="size-icon-xs not-disabled:hover:bg-accent-hover text-accent-subtle disabled:text-disabled block shrink not-disabled:cursor-pointer">
                        <Remove fontSize="inherit" className="h-1/2" />
                    </NumberFieldBase.Decrement>
                </div>
            </NumberFieldBase.Group>
        </NumberFieldBase.Root>
    );
}

function makeScrubAdornment(scrubAdornment: React.ReactNode): React.ReactNode {
    const wrapperClassName = "flex aspect-square h-6 items-center justify-center text-accent";

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

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(NumberInputComponent);
