import React from "react";

import { Menu as BaseMenu } from "@base-ui/react";

import { makeClassNameProp } from "@lib/components/_component-utils/baseUi";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

function MenuTriggerComponent(
    props: BaseMenu.Trigger.Props,
    ref: React.ForwardedRef<HTMLButtonElement>,
): React.ReactNode {
    const baseClassName = resolveClassNames(
        "flex gap-1 items-center",
        "p-1 text-sm rounded",
        "disabled:pointer-events-none",
        "text-gray-600 disabled:text-gray-400 hover:text-gray-900 ",
        "hover:bg-blue-200 data-popup-open:bg-blue-100",
        "focus:outline focus:outline-blue-600",
    );

    return <BaseMenu.Trigger {...props} ref={ref} className={makeClassNameProp(baseClassName, props.className)} />;
}

export const MenuTrigger = React.forwardRef(MenuTriggerComponent);
