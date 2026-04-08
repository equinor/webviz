import React from "react";

import { Toggle as ToggleBase } from "@base-ui/react";

import { Button } from "../Button";

export type ToggleButtonProps = {
    value?: string;
    defaultPressed?: boolean;
    pressed?: boolean;
    onPressedChange?: (pressed: boolean) => void;
    disabled?: boolean;
    ariaLabel?: string;
    baseVariant?: React.ComponentPropsWithoutRef<typeof Button>["variant"];
    children?:
        | React.ReactNode
        | ((props: React.ComponentPropsWithoutRef<typeof ToggleBase>, state: { pressed: boolean }) => React.ReactNode);
} & Omit<React.ComponentPropsWithoutRef<typeof Button>, "variant">;

const DEFAULT_VALUES = {
    baseVariant: "outlined",
} satisfies Partial<ToggleButtonProps>;

export const ToggleButton = React.forwardRef<HTMLButtonElement, ToggleButtonProps>(function ToggleButton(props, ref) {
    const {
        ariaLabel,
        value,
        defaultPressed,
        pressed,
        onPressedChange,
        disabled,
        children,
        baseVariant = DEFAULT_VALUES.baseVariant,
        ...restButtonProps
    } = props;
    return (
        <ToggleBase
            aria-label={ariaLabel}
            value={value}
            defaultPressed={defaultPressed}
            pressed={pressed}
            onPressedChange={onPressedChange}
            disabled={disabled}
            render={(toggleProps, state) => {
                let variant: React.ComponentPropsWithoutRef<typeof Button>["variant"] = baseVariant;
                if (state.pressed) {
                    variant = "contained";
                }

                let content: React.ReactNode;
                if (typeof children === "function") {
                    content = children(toggleProps, state);
                } else {
                    content = children;
                }

                return (
                    <Button ref={ref} variant={variant} {...restButtonProps} {...toggleProps}>
                        {content}
                    </Button>
                );
            }}
        />
    );
});
