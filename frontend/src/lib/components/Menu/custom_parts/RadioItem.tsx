import React from "react";

import { Menu as BaseMenu } from "@base-ui/react";
import { Check } from "@mui/icons-material";

import { makeClassNameProp } from "@lib/components/_component-utils/baseUi";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

function MenuRadioItemComponent(
    props: BaseMenu.RadioItem.Props,
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
        <BaseMenu.RadioItem {...props} ref={ref} className={makeClassNameProp(baseClassName, props.className)}>
            <BaseMenu.RadioItemIndicator keepMounted className="w-4 not-data-checked:invisible">
                <Check fontSize="inherit" />
            </BaseMenu.RadioItemIndicator>
            {props.children}
        </BaseMenu.RadioItem>
    );
}

export const MenuRadioItem = React.forwardRef(MenuRadioItemComponent);
