//                     className="text-sm p-0.5 flex gap-2 items-center"

import React from "react";

import { Menu as BaseMenu } from "@base-ui/react";

import { makeClassNameProp } from "@lib/components/_component-utils/baseUi";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

function MenuItemComponent(props: BaseMenu.Item.Props, ref: React.ForwardedRef<HTMLButtonElement>): React.ReactNode {
    const baseClassName = resolveClassNames(
        "flex gap-2 items-center",
        "px-4 py-2 text-sm rounded cursor-pointer",
        "disabled:opacity-30 disabled:pointer-events-none",
        "hover:bg-blue-100",
        "focus:outline focus:outline-blue-600",
    );

    return <BaseMenu.Item {...props} ref={ref} className={makeClassNameProp(baseClassName, props.className)} />;
}

export const MenuItem = React.forwardRef(MenuItemComponent);
