import React from "react";

import { Menu as BaseMenu } from "@base-ui/react";

import { makeClassNameProp } from "@lib/components/_component-utils/baseUi";
import { getTextSizeClassName } from "@lib/utils/componentSize";

import { MenuTextSizeContext } from "./Root";

export type MenuPopupProps = BaseMenu.Popup.Props & {
    side?: BaseMenu.Positioner.Props["side"];
    align?: BaseMenu.Positioner.Props["align"];
};

function MenuPopupComponent(props: MenuPopupProps, ref: React.ForwardedRef<HTMLDivElement>): React.ReactNode {
    const textSize = React.useContext(MenuTextSizeContext);
    const textSizeClassName = getTextSizeClassName(textSize);

    const baseClassName = `bg-white border shadow rounded p-1 max-h-80 overflow-auto z-50 ${textSizeClassName}`;

    return (
        <BaseMenu.Portal>
            <BaseMenu.Positioner className="z-9999" side={props.side} align={props.align}>
                <BaseMenu.Popup {...props} ref={ref} className={makeClassNameProp(baseClassName, props.className)}>
                    {props.children}
                </BaseMenu.Popup>
            </BaseMenu.Positioner>
        </BaseMenu.Portal>
    );
}

export const MenuPopup = React.forwardRef(MenuPopupComponent);
