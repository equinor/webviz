import React from "react";

import { getTextSizeClassName } from "@lib/utils/componentSize";

import { MenuTextSizeContext } from "./Root";

export type MenuItemContentProps = {
    icon?: React.ReactNode;
    label?: React.ReactNode;
    description?: React.ReactNode;
};

export function MenuItemContent(props: MenuItemContentProps) {
    const textSize = React.useContext(MenuTextSizeContext);

    if (props.description) {
        return (
            <>
                {props.icon && <span>{props.icon}</span>}
                <div>
                    <p className="font-bold">{props.label}</p>
                    <p className={getTextSizeClassName(textSize, -1)}>{props.description}</p>
                </div>
            </>
        );
    }

    return (
        <>
            {props.icon}
            {props.label}
        </>
    );
}
