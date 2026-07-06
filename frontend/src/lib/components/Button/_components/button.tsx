import React from "react";

import { Button as ButtonBase } from "@base-ui/react/button";
import type { ButtonProps as ButtonPropsBase } from "@base-ui/react/button";

import { useComponentSize } from "@lib/components/_shared/contexts/componentSizeContext";
import { withDefaults } from "@lib/components/_shared/utils/defaultProps";
import type { SelectableSize } from "@lib/components/_shared/utils/size";
import { getDataAttributesForSelectableSize } from "@lib/components/_shared/utils/size";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { resolveWrapperProps, type ComponentWrapperProps } from "../../_shared/utils/wrapperProps";
import {
    resolveButtonClassNames,
    resolveButtonLabelClassNames,
    STYLE_PROP_KEYS,
    type ButtonStyleProps,
} from "../_utils/resolveButtonStyle";

export type ButtonProps = ComponentWrapperProps<ButtonPropsBase> &
    ButtonStyleProps & {
        /** Controls the pressed/toggled visual state of the button. */
        pressed?: boolean;

        /** Button size. @default "default" */
        size?: SelectableSize;

        /** Icon to be displayed inside the button next to the label. When an icon is provided without children, the button will be rendered as an icon-only button. */
        icon?: React.ReactNode;

        /** Position of the icon inside the button. @default "start" */
        iconPosition?: "start" | "end";
    };

const DEFAULT_PROPS = {
    size: "default",
    iconPosition: "start",
} satisfies Partial<ButtonProps>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(props, ref) {
    const defaultedProps = withDefaults(props, DEFAULT_PROPS);
    const baseProps = resolveWrapperProps(
        defaultedProps,
        "pressed",
        "size",
        "iconPosition",
        "icon",
        ...STYLE_PROP_KEYS,
    );
    const size = useComponentSize(defaultedProps);

    let iconOnly = defaultedProps.iconOnly;
    if (defaultedProps.icon && !defaultedProps.children) {
        iconOnly = true;
    }

    return (
        <ButtonBase
            {...baseProps}
            {...getDataAttributesForSelectableSize(size, true)}
            ref={ref}
            data-pressed={defaultedProps.pressed ? "" : undefined}
            className={resolveClassNames(baseProps.className, resolveButtonClassNames(size, defaultedProps))}
            style={{
                minHeight: "calc(var(--eds-selectable-space-vertical) * 2 + round(1cap , 4px))",
                ...baseProps.style,
            }}
        >
            {iconOnly ? (
                <ButtonIcon size={size} iconOnly>
                    {defaultedProps.icon ?? defaultedProps.children}
                </ButtonIcon>
            ) : (
                <span className={resolveButtonLabelClassNames(size)}>
                    {defaultedProps.icon && defaultedProps.iconPosition === "start" && (
                        <ButtonIcon size={size}>{defaultedProps.icon}</ButtonIcon>
                    )}
                    {defaultedProps.children}
                    {defaultedProps.icon && defaultedProps.iconPosition === "end" && (
                        <ButtonIcon size={size}>{defaultedProps.icon}</ButtonIcon>
                    )}
                </span>
            )}
        </ButtonBase>
    );
});

type ButtonIconProps = {
    children: React.ReactNode;
    size: SelectableSize;
    iconOnly?: boolean;
};

function ButtonIcon(props: ButtonIconProps) {
    return (
        <span
            className={resolveClassNames("flex items-center justify-center", {
                "text-body-sm!": props.size === "small",
                "text-body-lg!": props.size === "default",
                "text-body-xl!": props.size === "large",
                "self-end": !props.iconOnly,
            })}
        >
            {props.children}
        </span>
    );
}
