import React from "react";

import type { MenuCheckboxItemProps as MenuCheckboxItemBaseProps } from "@base-ui/react";

import { SharedCheckboxItem } from "@lib/newComponents/_shared/components/menus/checkboxItem";
import type { MenuItemContentProps } from "@lib/newComponents/_shared/components/menus/itemContent";
import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";

export type MenuCheckboxItemProps = ComponentWrapperProps<MenuCheckboxItemBaseProps> & MenuItemContentProps;

function CheckboxItemComponent(props: MenuCheckboxItemProps, ref: React.ForwardedRef<HTMLDivElement>): React.ReactNode {
    const baseProps = resolveWrapperProps(props);

    return <SharedCheckboxItem ref={ref} {...baseProps} />;
}

export const CheckboxItem = React.forwardRef(CheckboxItemComponent);
