import React from "react";

import type { ToggleProps as ToggleBaseProps } from "@base-ui/react";
import { Toggle as ToggleBase } from "@base-ui/react";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";

import { Button as Button_, type ButtonProps as ButtonProps_ } from "../../Button";

export type ButtonProps<TValue extends string> = ComponentWrapperProps<
    Omit<ToggleBaseProps<TValue>, "variant" | "ref" | "children">
> & {
    /** Additional props forwarded to the underlying `Button` component (e.g. `size`, `tone`, `iconOnly`). */
    buttonProps?: Omit<ButtonProps_, "ref">;
    /** The button label content. Can be a render function that receives toggle props and `{ pressed }`. */
    children?:
        | React.ReactNode
        | ((
              props: Omit<React.ComponentPropsWithoutRef<typeof ToggleBase>, "children">,
              state: { pressed: boolean },
          ) => React.ReactNode);
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps<string>>(function ToggleButton(props, ref) {
    const { buttonProps, children, ...rest } = props;
    const baseProps = resolveWrapperProps(rest);

    return (
        <ToggleBase
            {...baseProps}
            render={(toggleProps, state) => {
                let variant: ButtonProps_["variant"] = "outlined";
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
                    <Button_ ref={ref} {...buttonProps} variant={variant} {...toggleProps}>
                        {content}
                    </Button_>
                );
            }}
        />
    );
});
