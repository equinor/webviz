import type { HTMLAttributes } from "react";
import React from "react";

import { Clear } from "@mui/icons-material";

import { withDefaults } from "../_shared/utils/defaultProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { resolveWrapperProps, type ComponentWrapperProps } from "../_shared/utils/wrapperProps";
import { Button } from "../Button";

export type ChipProps = {
    /** The HTML element or component to render as the chip container. @default "div" */
    as?: React.ElementType;
    /** Content rendered inside the chip. */
    children?: React.ReactNode;
    /** Controls the color tone of the chip. */
    tone: "accent" | "neutral" | "danger" | "warning";
    /** When true, disables interaction with the chip. @default false */
    disabled?: boolean;
    /** When true, shows the chip in a selected/active state. @default false */
    selected?: boolean;
    /** Element rendered at the leading end of the chip. */
    startAdornment?: React.ReactNode;
    /** Called when the remove button is clicked. */
    onRemove?: () => void;
    /**
     * Utility function that allows you to wrap the button. Generally only relevant for rendering Base-UI function components, such as `Combobox.ChipRemove`
     *
     * @example ```tsx
     *      <Chip {..args} wrapRemoveButton={(btn) => <Combobox.ChipRemove render={btn} />} />
     * ```
     */
    wrapRemoveButton?: (button: React.ReactElement) => React.ReactNode;
} & ComponentWrapperProps<HTMLAttributes<HTMLElement>>;

const DEFAULT_PROPS = {
    as: "div",
    disabled: false,
    selected: false,
} satisfies Partial<ChipProps>;

function ChipComponent(props: ChipProps, ref: React.ForwardedRef<HTMLElement>): React.ReactNode {
    const defaultedProps = withDefaults(props, DEFAULT_PROPS);
    const Component = defaultedProps.as;
    const baseProps = resolveWrapperProps(
        defaultedProps,
        "as",
        "children",
        "tone",
        "disabled",
        "startAdornment",
        "selected",
        "onRemove",
        "wrapRemoveButton",
    );

    const isDisabled = defaultedProps.disabled || defaultedProps.selected;

    const removeButton = (
        <Button
            tabIndex={-1}
            iconOnly
            size="small"
            tone={defaultedProps.tone}
            disabled={isDisabled}
            variant="ghost"
            layoutClassName={resolveClassNames("ml-3xs shrink-0 self-stretch border-l rounded-l-none", {
                "border-warning": defaultedProps.tone === "warning",
                "border-danger": defaultedProps.tone === "danger",
                "border-neutral": defaultedProps.tone === "neutral",
                "border-accent": defaultedProps.tone === "accent",
            })}
            onClick={(e) => {
                e.stopPropagation();
                defaultedProps.onRemove?.();
            }}
        >
            <Clear />
        </Button>
    );

    return (
        <Component
            {...baseProps}
            ref={ref as any}
            data-tone={defaultedProps.tone}
            data-disabled={isDisabled ? "" : undefined}
            aria-disabled={isDisabled}
            className={resolveClassNames(
                baseProps.className,
                "relative rounded-sm",
                "gap-3xs flex items-center overflow-hidden",
                "pl-2xs",
                "data-disabled:opacity-75",
                "text-neutral-strong data-[tone=warning]:text-warning-subtle data-[tone=danger]:text-danger-subtle",
                "bg-neutral data-[tone=warning]:bg-warning data-[tone=danger]:bg-danger",
            )}
        >
            {defaultedProps.startAdornment}
            <div className="flex min-w-0 flex-1 items-center self-stretch overflow-x-hidden">{defaultedProps.children}</div>
            {defaultedProps.wrapRemoveButton?.(removeButton) ?? removeButton}
            {defaultedProps.selected && (
                <div className="bg-accent-strong absolute top-0 left-0 z-10 block h-full w-full rounded-sm opacity-50" />
            )}
        </Component>
    );
}

export const Chip = React.forwardRef(ChipComponent);
