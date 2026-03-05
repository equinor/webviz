import React from "react";

import { Menu as BaseMenu } from "@base-ui/react";
import { Check } from "@mui/icons-material";

import { makeClassNameProp } from "@lib/components/_component-utils/baseUi";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

function MenuCheckBoxItemComponent(
    props: BaseMenu.CheckboxItem.Props,
    ref: React.ForwardedRef<HTMLButtonElement>,
): React.ReactNode {
    const baseClassName = resolveClassNames(
        "flex gap-2 items-center",
        "px-4 py-2 rounded cursor-pointer",
        "disabled:opacity-30 disabled:pointer-events-none",
        "hover:bg-blue-100",
        "focus:outline focus:outline-blue-600",
    );

    return (
        <BaseMenu.CheckboxItem {...props} ref={ref} className={makeClassNameProp(baseClassName, props.className)}>
            <BaseMenu.CheckboxItemIndicator keepMounted className="w-4">
                {props.checked && <Check fontSize="inherit" />}
            </BaseMenu.CheckboxItemIndicator>
            {props.children}
        </BaseMenu.CheckboxItem>
    );
}

export const MenuCheckBoxItem = React.forwardRef(MenuCheckBoxItemComponent);
