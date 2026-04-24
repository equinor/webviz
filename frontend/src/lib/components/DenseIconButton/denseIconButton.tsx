import React from "react";

import { Tooltip } from "@lib/components/Tooltip";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export enum DenseIconButtonColorScheme {
    DEFAULT = "default",
    WARNING = "warning",
    SUCCESS = "success",
    DANGER = "danger",
}

const COLOR_SCHEMES: Record<DenseIconButtonColorScheme, string> = {
    [DenseIconButtonColorScheme.DEFAULT]: "hover:bg-blue-200 focus-visible:outline-blue-600",
    [DenseIconButtonColorScheme.WARNING]: "hover:bg-yellow-200 focus-visible:outline-yellow-600",
    [DenseIconButtonColorScheme.SUCCESS]: "hover:bg-green-200 focus-visible:outline-green-600",
    [DenseIconButtonColorScheme.DANGER]: "hover:bg-red-200 focus-visible:outline-red-600",
};

export type DenseIconButtonProps = {
    id?: string;
    onClick?: (e: React.PointerEvent<HTMLButtonElement>) => void;
    onPointerDown?: (e: React.PointerEvent<HTMLButtonElement>) => void;
    onPointerUp?: (e: React.PointerEvent<HTMLButtonElement>) => void;
    colorScheme?: DenseIconButtonColorScheme;
    children: React.ReactNode;
    title?: string;
    disabled?: boolean;
    className?: string;
};

// NOTE: The wrapped EDS `Tooltip` clones its child and replaces the child's `ref`, reading the
// original ref from `children.props.ref` (React 19 convention). In React 18, refs are not present
// in `props`, so a ref passed through this component would be silently dropped. To work around
// this, we read our forwarded ref via a regular prop on an inner forwardRef component and merge
// it with whatever ref the Tooltip assigns via cloneElement.
type InnerButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    outerButtonRef: React.ForwardedRef<HTMLButtonElement>;
};

const InnerButton = React.forwardRef<HTMLButtonElement, InnerButtonProps>(function InnerButton(
    { outerButtonRef, ...rest },
    tooltipRef,
) {
    const combinedRef = React.useCallback(
        (el: HTMLButtonElement | null) => {
            if (typeof tooltipRef === "function") {
                tooltipRef(el);
            } else if (tooltipRef) {
                tooltipRef.current = el;
            }
            if (typeof outerButtonRef === "function") {
                outerButtonRef(el);
            } else if (outerButtonRef) {
                outerButtonRef.current = el;
            }
        },
        [tooltipRef, outerButtonRef],
    );

    return <button ref={combinedRef} {...rest} />;
});

export const DenseIconButton = React.forwardRef(function DenseIconButton(
    props: DenseIconButtonProps,
    ref: React.ForwardedRef<HTMLButtonElement>,
): React.ReactNode {
    const colorScheme = COLOR_SCHEMES[props.colorScheme ?? DenseIconButtonColorScheme.DEFAULT];

    function handleClick(e: React.PointerEvent<HTMLButtonElement>): void {
        if (props.onClick) {
            props.onClick(e);
        }
    }

    return (
        <Tooltip title={props.title}>
            <InnerButton
                outerButtonRef={ref}
                id={props.id}
                className={resolveClassNames(props.className, "p-1 text-sm rounded-sm flex gap-1 items-center", {
                    [colorScheme + "text-gray-600 focus-visible:outline-1 hover:text-gray-900"]: !props.disabled,
                    "text-gray-300": props.disabled,
                })}
                disabled={props.disabled}
                onClick={handleClick as unknown as React.MouseEventHandler<HTMLButtonElement>}
                onPointerDown={props.onPointerDown}
                onPointerUp={props.onPointerUp}
            >
                {props.children}
            </InnerButton>
        </Tooltip>
    );
});

DenseIconButton.displayName = "DenseIconButton";
