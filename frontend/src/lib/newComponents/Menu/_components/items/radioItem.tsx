import React from "react";

import type { MenuRadioItemProps as MenuRadioItemBaseProps } from "@base-ui/react";

import type { MenuItemContentProps } from "@lib/newComponents/_shared/components/menus/itemContent";
import { SharedRadioItem } from "@lib/newComponents/_shared/components/menus/radioItem";
import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";

export type MenuRadioItemProps = ComponentWrapperProps<MenuRadioItemBaseProps> & MenuItemContentProps;

function RadioItemComponent(props: MenuRadioItemProps, ref: React.ForwardedRef<HTMLDivElement>): React.ReactNode {
    const baseProps = resolveWrapperProps(props) as MenuRadioItemBaseProps;

    return <SharedRadioItem ref={ref} {...baseProps} />;
}

export const RadioItem = React.forwardRef(RadioItemComponent);
