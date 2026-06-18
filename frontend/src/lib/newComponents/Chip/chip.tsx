import type { HTMLAttributes } from "react";
import React from "react";

import { Clear } from "@mui/icons-material";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { resolveWrapperProps, type ComponentWrapperProps } from "../_shared/utils/wrapperProps";
import { Button } from "../Button";

export type ChipProps = {
    as?: React.ElementType;
    children?: React.ReactNode;
    tone: "accent" | "neutral" | "danger" | "warning";
    disabled?: boolean;
    selected?: boolean;
    startAdornment?: React.ReactNode;
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

function ChipComponent(props: ChipProps, ref: React.ForwardedRef<HTMLElement>): React.ReactNode {
    const Component = props.as ?? "div";
    const baseProps = resolveWrapperProps(
        props,
        "as",
        "children",
        "tone",
        "disabled",
        "startAdornment",
        "selected",
        "onRemove",
        "wrapRemoveButton",
    ) as HTMLAttributes<HTMLElement>;

    const removeButton = (
        <Button
            tabIndex={-1}
            iconOnly
            size="small"
            tone={props.tone}
            disabled={props.disabled}
            variant="ghost"
            layoutClassName={resolveClassNames("ml-3xs shrink-0 self-stretch border-l rounded-l-none", {
                "border-warning": props.tone === "warning",
                "border-danger": props.tone === "danger",
                "border-neutral": props.tone === "neutral",
                "border-accent": props.tone === "accent",
            })}
            onClick={(e) => {
                e.stopPropagation();
                props.onRemove?.();
            }}
        >
            <Clear />
        </Button>
    );

    return (
        <Component
            {...baseProps}
            ref={ref as any}
            data-tone={props.tone}
            data-disabled={props.disabled ? "" : undefined}
            aria-disabled={props.disabled}
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
            {props.startAdornment}
            <div className="flex min-w-0 flex-1 items-center self-stretch overflow-x-hidden">{props.children}</div>
            {props.wrapRemoveButton?.(removeButton) ?? removeButton}
            {props.selected && (
                <div className="bg-accent-strong absolute top-0 left-0 z-10 block h-full w-full rounded-sm opacity-50" />
            )}
        </Component>
    );
}

export const Chip = React.forwardRef(ChipComponent);
