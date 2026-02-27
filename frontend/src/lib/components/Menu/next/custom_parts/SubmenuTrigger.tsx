import React from "react";

import { Menu as BaseMenu } from "@base-ui/react";

import { makeClassNameProp } from "@lib/components/_component-utils/baseUi";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

function SubmenuTriggerComponent(
    props: BaseMenu.SubmenuTrigger.Props,
    ref: React.ForwardedRef<HTMLButtonElement>,
): React.ReactNode {
    const baseClassName = resolveClassNames(
        "flex gap-2 items-center",
        "px-4 py-2 text-sm",
        "disabled:pointer-events-none",
        "text-gray-700 disabled:text-gray-400 hover:text-gray-900 ",
        "hover:bg-blue-200 data-popup-open:bg-blue-200",
        "focus:outline focus:outline-blue-600",
    );

    return (
        <BaseMenu.SubmenuTrigger {...props} ref={ref} className={makeClassNameProp(baseClassName, props.className)} />
    );
}

export const SubmenuTrigger = React.forwardRef(SubmenuTriggerComponent);
