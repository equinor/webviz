import React from "react";

import { Menu as BaseMenu } from "@base-ui/react";

import { makeClassNameProp } from "@lib/components/_component-utils/baseUi";

function MenuPopupComponent(props: BaseMenu.Popup.Props, ref: React.ForwardedRef<HTMLDivElement>): React.ReactNode {
    const baseClassName = "bg-white border shadow text-sm rounded p-1 max-h-80 overflow-auto z-50";

    return <BaseMenu.Popup {...props} ref={ref} className={makeClassNameProp(baseClassName, props.className)} />;
}

export const MenuPopup = React.forwardRef(MenuPopupComponent);
