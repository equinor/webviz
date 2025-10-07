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
    [DenseIconButtonColorScheme.DEFAULT]: "hover:bg-blue-200 focus:outline-blue-600",
    [DenseIconButtonColorScheme.WARNING]: "hover:bg-yellow-200 focus:outline-yellow-600",
    [DenseIconButtonColorScheme.SUCCESS]: "hover:bg-green-200 focus:outline-green-600",
    [DenseIconButtonColorScheme.DANGER]: "hover:bg-red-200 focus:outline-red-600",
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
            <button
                ref={ref}
                id={props.id}
                className={resolveClassNames(props.className, "p-1 text-sm rounded-sm flex gap-1 items-center", {
                    [colorScheme + "text-gray-600 focus:outline hover:text-gray-900"]: !props.disabled,
                    "text-gray-300": props.disabled,
                })}
                disabled={props.disabled}
                onClick={handleClick}
                onPointerDown={props.onPointerDown}
                onPointerUp={props.onPointerUp}
            >
                {props.children}
            </button>
        </Tooltip>
    );
});

DenseIconButton.displayName = "DenseIconButton";
