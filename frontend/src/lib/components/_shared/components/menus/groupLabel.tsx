import React from "react";

import { Menu as MenuBase, ContextMenu as ContextMenuBase, Combobox as ComboboxBase } from "@base-ui/react";
import type { MenuGroupLabelProps as MenuGroupLabelBaseProps } from "@base-ui/react";

import { useComponentSize } from "@lib/components/_shared/contexts/componentSizeContext";
import { getNextTextSize, getTextSizeForSelectableSize } from "@lib/components/_shared/utils/size";
import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/components/_shared/utils/wrapperProps";
import { Typography } from "@lib/components/Typography";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useMenuVariant } from "../../contexts/menuVariantContext";

export type SharedGroupLabelProps = ComponentWrapperProps<MenuGroupLabelBaseProps>;

const BASE_COMPONENT = {
    contextMenu: ContextMenuBase.GroupLabel,
    menu: MenuBase.GroupLabel,
    combobox: ComboboxBase.GroupLabel,
} as const;

function SharedGroupLabelComponent(
    props: SharedGroupLabelProps,
    ref: React.ForwardedRef<HTMLDivElement>,
): React.ReactNode {
    const baseProps = resolveWrapperProps(props);
    const menuItemSize = useComponentSize();
    const labelTextSize = getNextTextSize(getTextSizeForSelectableSize(menuItemSize), -1);
    const menuVariant = useMenuVariant();

    const BaseComp = BASE_COMPONENT[menuVariant];

    return (
        <BaseComp
            {...baseProps}
            ref={ref}
            className={resolveClassNames("menu__item menu__label", props.layoutClassName)}
            render={<Typography ref={ref} as="div" size={labelTextSize} weight="bolder" />}
        />
    );
}

export const SharedGroupLabel = React.forwardRef(SharedGroupLabelComponent);
