import React from "react";

import type { MenuRadioItemProps as MenuRadioItemBaseProps } from "@base-ui/react";

import type { MenuItemContentProps } from "@lib/components/_shared/components/menus/itemContent";
import { SharedRadioItem } from "@lib/components/_shared/components/menus/radioItem";
import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/components/_shared/utils/wrapperProps";

export type MenuRadioItemProps = ComponentWrapperProps<MenuRadioItemBaseProps> & MenuItemContentProps;

export const RadioItem = React.forwardRef<HTMLDivElement, MenuRadioItemProps>(function RadioItem(props, ref) {
    const baseProps = resolveWrapperProps(props);

    return <SharedRadioItem ref={ref} {...baseProps} />;
});
