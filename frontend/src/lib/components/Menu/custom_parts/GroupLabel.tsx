import React from "react";

import { Menu as BaseMenu } from "@base-ui/react";

import { makeClassNameProp } from "@lib/components/_component-utils/baseUi";
import { getTextSizeClassName } from "@lib/utils/componentSize";

import { MenuTextSizeContext } from "./Root";

function MenuGroupLabelComponent(
    props: BaseMenu.GroupLabel.Props,
    ref: React.ForwardedRef<HTMLDivElement>,
): React.ReactNode {
    const textSize = React.useContext(MenuTextSizeContext);
    const textSizeClassName = getTextSizeClassName(textSize, -1);

    const baseClassName = `text-gray-500 uppercase font-semibold tracking-wider px-3 py-1 ${textSizeClassName}`;

    return <BaseMenu.GroupLabel {...props} ref={ref} className={makeClassNameProp(baseClassName, props.className)} />;
}

export const MenuGroupLabel = React.forwardRef(MenuGroupLabelComponent);
