import React from "react";

import { Menu as MenuBase } from "@base-ui/react";
import type { MenuGroupLabelProps as MenuGroupLabelBaseProps } from "@base-ui/react";

import { useComponentSize } from "@lib/newComponents/_shared/contexts/componentSizeContext";
import { getNextTextSize, getTextSizeForSelectableSize } from "@lib/newComponents/_shared/utils/size";
import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { Typography } from "@lib/newComponents/Typography";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type MenuGroupLabelProps = ComponentWrapperProps<MenuGroupLabelBaseProps>;

function GroupLabelComponent(props: MenuGroupLabelProps, ref: React.ForwardedRef<HTMLDivElement>): React.ReactNode {
    const baseProps = resolveWrapperProps(props);
    const menuItemSize = useComponentSize();
    const labelTextSize = getNextTextSize(getTextSizeForSelectableSize(menuItemSize), -1);

    return (
        <MenuBase.GroupLabel
            {...baseProps}
            ref={ref}
            className={resolveClassNames("menu__item text-neutral-strong!", props.layoutClassName)}
            render={<Typography ref={ref} as="div" size={labelTextSize} weight="bolder" />}
        />
    );
}

export const GroupLabel = React.forwardRef(GroupLabelComponent);
