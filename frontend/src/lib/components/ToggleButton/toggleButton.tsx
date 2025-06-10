import React from "react";

import type { ButtonProps as ButtonUnstyledProps } from "@mui/base";
import { Button as ButtonUnstyled } from "@mui/base";

import { BaseComponent } from "../BaseComponent";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

type Variant = "outlined" | "contained" | "text";
type Color = "primary" | "danger" | "success" | "secondary";

const baseClasses: Record<Variant, string[]> = {
    outlined: ["border", "bg-transparent"],
    contained: ["border", "border-transparent", "text-white"],
    text: ["bg-transparent"],
};

const variantColorClasses: Record<Variant, Record<Color, string[]>> = {
    outlined: {
        primary: ["border-indigo-600", "text-indigo-600", "hover:bg-indigo-50"],
        danger: ["border-red-600", "text-red-600", "hover:bg-red-50"],
        success: ["border-green-600", "text-green-600", "hover:bg-green-50"],
        secondary: ["border-slate-500", "text-slate-600", "hover:bg-slate-50"],
    },
    contained: {
        primary: ["bg-indigo-600", "hover:bg-indigo-700"],
        danger: ["bg-red-600", "hover:bg-red-700"],
        success: ["bg-green-600", "hover:bg-green-700"],
        secondary: ["bg-slate-500", "hover:bg-slate-600"],
    },
    text: {
        primary: ["text-indigo-600", "hover:bg-indigo-100"],
        danger: ["text-red-600", "hover:bg-red-100"],
        success: ["text-green-600", "hover:bg-green-100"],
        secondary: ["text-slate-600", "hover:bg-slate-100"],
    },
};

const activeOverrides: Partial<Record<Variant, Partial<Record<Color, string[]>>>> = {
    outlined: {
        primary: ["bg-indigo-600", "text-white", "hover:bg-indigo-500"],
        danger: ["bg-red-600", "text-white", "hover:bg-red-500"],
        success: ["bg-green-600", "text-white", "hover:bg-green-500"],
        secondary: ["bg-slate-500", "text-white", "hover:bg-slate-400"],
    },
    contained: {
        primary: ["bg-indigo-700", "text-white", "hover:bg-indigo-600"],
        danger: ["bg-red-700", "text-white", "hover:bg-red-600"],
        success: ["bg-green-700", "text-white", "hover:bg-green-600"],
        secondary: ["bg-slate-600", "text-white", "hover:bg-slate-500"],
    },
    text: {
        primary: ["bg-indigo-500", "text-white", "hover:bg-indigo-400"],
        danger: ["bg-red-500", "text-white", "hover:bg-red-400"],
        success: ["bg-green-500", "text-white", "hover:bg-green-400"],
        secondary: ["bg-slate-500", "text-white", "hover:bg-slate-400"],
    },
};

function getClassNames(variant: Variant, color: Color = "primary", active: boolean): string[] {
    let classes = [...baseClasses[variant], ...variantColorClasses[variant][color]];

    if (active) {
        // Remove background and hover background classes
        classes = classes.filter((c) => !/^bg-|^hover:bg-/.test(c));

        const override = activeOverrides[variant]?.[color];
        if (override) {
            classes.push(...override);
        }
    }

    return classes;
}

export type ToggleButtonProps = ButtonUnstyledProps & {
    active: boolean;
    size?: "small" | "medium" | "large";
    variant?: Variant;
    color?: Color;
    onToggle: (active: boolean) => void;
    buttonRef?: React.Ref<HTMLButtonElement>;
};

function ToggleButtonComponent(props: ToggleButtonProps, ref: React.ForwardedRef<HTMLDivElement>) {
    const { active, onToggle, color, variant, size, ...other } = props;
    const [isActive, setIsActive] = React.useState<boolean>(active);
    const [prevIsActive, setPrevIsActive] = React.useState<boolean>(active);

    if (active !== prevIsActive) {
        setIsActive(active);
        setPrevIsActive(active);
    }

    const buttonRef = React.useRef<HTMLButtonElement>(null);
    React.useImperativeHandle<HTMLButtonElement | null, HTMLButtonElement | null>(
        props.buttonRef,
        () => buttonRef.current,
    );

    if (active !== prevIsActive) {
        setIsActive(active);
        setPrevIsActive(isActive);
    }

    const handleClick = React.useCallback(() => {
        setIsActive(!isActive);
        onToggle(!active);
    }, [active, onToggle, isActive]);

    const classNames = [
        "inline-flex",
        "items-center",
        ...(props.size === "medium"
            ? ["px-2", "py-1"]
            : props.size === "small"
              ? ["px-1", "py-0.5"]
              : ["px-4", "py-2"]),
        "font-medium",
        "rounded-md",
        ...getClassNames(variant ?? "text", color ?? "primary", active),
    ];

    return (
        <BaseComponent ref={ref} disabled={props.disabled}>
            <ButtonUnstyled
                {...other}
                onClick={handleClick}
                ref={buttonRef}
                slotProps={{
                    root: {
                        className: resolveClassNames(...classNames),
                    },
                }}
            />
        </BaseComponent>
    );
}

export const ToggleButton = React.forwardRef(ToggleButtonComponent);
