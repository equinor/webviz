import React from "react";

import type {
    NumberFieldInputProps as NumberFieldInputBaseProps,
    NumberFieldRootProps as NumberFieldRootBaseProps,
} from "@base-ui/react/number-field";
import { NumberField as NumberFieldBase } from "@base-ui/react/number-field";
import { Add, Remove } from "@mui/icons-material";
import _ from "lodash";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type NumberInputProps = Omit<NumberFieldRootBaseProps, "className"> & {
    unitIcon?: React.ReactNode;

    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;

    disableUnitScrubArea?: boolean;
    /**
     * @default "start"
     */
    unitPlacement?: "start" | "end";

    // Exposed parts-props
    placeholder?: NumberFieldInputBaseProps["placeholder"];
};

const DEFAULT_PROPS = {
    unitPlacement: "start",
} satisfies Partial<NumberInputProps>;

function NumberInputComponent(props: NumberInputProps, ref: React.ForwardedRef<HTMLInputElement>): React.ReactNode {
    const defaultedProps = { ...DEFAULT_PROPS, ...props };
    const baseRootProps = _.omit(defaultedProps, [
        "unitIcon",
        "startAdornment",
        "endAdornment",
        "disableUnitScrubArea",
        "unitPosition",
        "placeholder",
    ]);

    const wrappedUnitIcon = makeUnitIcon(defaultedProps.unitIcon, defaultedProps.disableUnitScrubArea);

    return (
        <NumberFieldBase.Root
            className={resolveClassNames(
                "bg-canvas text-body-lg",
                "gap-vertical-xs flex items-center pr-0",
                "data-invalid:outline-danger data-invalid:bg-danger-surface",
                {
                    "form-element outline-neutral text-neutral outline -outline-offset-1": !defaultedProps.disabled,
                    "text-disabled cursor-not-allowed outline-transparent": defaultedProps.disabled,
                },
            )}
            {...baseRootProps}
        >
            <NumberFieldBase.Group className="gap-vertical-3xs pl-vertical-xs flex grow items-center">
                {defaultedProps.startAdornment}
                {defaultedProps.unitPlacement === "start" && wrappedUnitIcon}

                <NumberFieldBase.Input
                    className="py-vertical-3xs grow outline-0 data-disabled:cursor-not-allowed"
                    ref={ref}
                    placeholder={defaultedProps.placeholder}
                />

                {defaultedProps.unitPlacement === "end" && wrappedUnitIcon}
                {defaultedProps.endAdornment}

                <div className="text-body-xs max-h-full flex-col">
                    <NumberFieldBase.Increment className="size-icon-xs not-disabled:hover:bg-accent-hover disabled:text-disabled text-accent-subtle block shrink">
                        <Add fontSize="inherit" className="h-1/2" />
                    </NumberFieldBase.Increment>
                    <NumberFieldBase.Decrement className="size-icon-xs not-disabled:hover:bg-accent-hover text-accent-subtle disabled:text-disabled block shrink">
                        <Remove fontSize="inherit" className="h-1/2" />
                    </NumberFieldBase.Decrement>
                </div>
            </NumberFieldBase.Group>
        </NumberFieldBase.Root>
    );
}

function makeUnitIcon(unitIcon: React.ReactNode, disableUnitScrubArea: boolean | undefined): React.ReactNode {
    const wrapperClassName = "flex aspect-square h-6 items-center justify-center text-accent";

    if (!unitIcon) return null;
    if (disableUnitScrubArea) return <span className={wrapperClassName}>{unitIcon}</span>;

    return (
        <NumberFieldBase.ScrubArea
            className={(state) => {
                if (state.disabled) return wrapperClassName;
                return `${wrapperClassName} cursor-ew-resize`;
            }}
        >
            {unitIcon}
            <NumberFieldBase.ScrubAreaCursor className="drop-shadow-[0_1px_1px_#0008] filter">
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
