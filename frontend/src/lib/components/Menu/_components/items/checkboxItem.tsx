import React from "react";

import type { MenuCheckboxItemProps as MenuCheckboxItemBaseProps } from "@base-ui/react";

import { SharedCheckboxItem } from "@lib/components/_shared/components/menus/checkboxItem";
import type { MenuItemContentProps } from "@lib/components/_shared/components/menus/itemContent";
import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/components/_shared/utils/wrapperProps";

export type MenuCheckboxItemProps = ComponentWrapperProps<MenuCheckboxItemBaseProps> & MenuItemContentProps;

export const CheckboxItem = React.forwardRef<HTMLDivElement, MenuCheckboxItemProps>(function CheckboxItem(props, ref) {
    const baseProps = resolveWrapperProps(props);

    return <SharedCheckboxItem ref={ref} {...baseProps} />;
});
