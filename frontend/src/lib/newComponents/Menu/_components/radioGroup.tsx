import React from "react";

import type { MenuRadioGroupProps as MenuRadioGroupBaseProps } from "@base-ui/react";
import { Menu as MenuBase } from "@base-ui/react";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";

export type MenuRadioGroupProps = ComponentWrapperProps<MenuRadioGroupBaseProps>;

function RadioGroupComponent(props: MenuRadioGroupProps, ref: React.ForwardedRef<HTMLDivElement>): React.ReactNode {
    const baseProps = resolveWrapperProps(props);

    return (
        // TODO: Use a normal group as the base to allow a GroupLabel to be inside radio groups.
        // This will be supported in 1.5
        <MenuBase.Group {...baseProps} ref={ref} render={<MenuBase.RadioGroup />} />
    );
}

export const RadioGroup = React.forwardRef(RadioGroupComponent);
