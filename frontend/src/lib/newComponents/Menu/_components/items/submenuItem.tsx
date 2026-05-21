import React from "react";

import { Menu as MenuBase } from "@base-ui/react";
import type { MenuSubmenuRootProps as SubmenuRootBaseProps } from "@base-ui/react";
import { ChevronRight } from "@mui/icons-material";

import type { ComponentWrapperProps } from "@lib/newComponents/_shared/wrapperProps";
import { resolveWrapperProps } from "@lib/newComponents/_shared/wrapperProps";

import { Popup } from "../popup";

import { ItemContent } from "./itemContent";

export type SubmenuItemProps = ComponentWrapperProps<SubmenuRootBaseProps> & {
    triggerContent: React.ReactNode;
    children: React.ReactNode;
};

function SubmenuItemCompontent(props: SubmenuItemProps, ref: React.ForwardedRef<HTMLDivElement>): React.ReactNode {
    const baseProps = resolveWrapperProps(props, "triggerContent", "children");
    return (
        <MenuBase.SubmenuRoot {...baseProps}>
            <MenuBase.SubmenuTrigger
                className="menu__item menu__interactable pr-vertical-xs gap-horizontal-2xs flex"
                ref={ref}
            >
                <span className="grow">
                    <ItemContent>{props.triggerContent}</ItemContent>
                </span>
                <ChevronRight fontSize="inherit" className="ml-vertical-2xs" />
            </MenuBase.SubmenuTrigger>
            <Popup side="right" align="start">
                {props.children}
            </Popup>
        </MenuBase.SubmenuRoot>
    );
}

export const SubmenuItem = React.forwardRef(SubmenuItemCompontent);
