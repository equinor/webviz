import React from "react";

import { Button as ButtonBase } from "@base-ui/react/button";
import type { ButtonProps as ButtonPropsBase } from "@base-ui/react/button";

import { useComponentSize } from "@lib/newComponents/_shared/contexts/componentSizeContext";
import type { SelectableSize } from "@lib/newComponents/_shared/utils/size";
import { getDataAttributesForSelectableSize } from "@lib/newComponents/_shared/utils/size";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { resolveWrapperProps, type ComponentWrapperProps } from "../../_shared/utils/wrapperProps";
import {
    resolveButtonClassNames,
    resolveButtonLabelClassNames,
    STYLE_PROP_KEYS,
    type ButtonStyleProps,
} from "../_utils/resolveButtonStyle";

type WrapperProps = ComponentWrapperProps<Omit<ButtonPropsBase, "ref">>;
export type ButtonProps = WrapperProps &
    ButtonStyleProps & {
        /** Controls the pressed/toggled visual state of the button. */
        pressed?: boolean;

        /** Button size */
        size?: SelectableSize;
    };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(props, ref) {
    const baseProps = resolveWrapperProps(props, "pressed", "size", ...STYLE_PROP_KEYS);
    const size = useComponentSize(props);

    return (
        <ButtonBase
            ref={ref}
            {...baseProps}
            {...getDataAttributesForSelectableSize(size, true)}
            data-pressed={props.pressed ? "" : undefined}
            className={resolveClassNames(baseProps.className, resolveButtonClassNames(size, props))}
            style={{
                minHeight: "calc(var(--eds-selectable-space-vertical) * 2 + round(1cap , 4px))",
                ...baseProps.style,
            }}
        >
            {props.iconOnly ? (
                props.children
            ) : (
                <span className={resolveButtonLabelClassNames(size)}>{props.children}</span>
            )}
        </ButtonBase>
    );
});
