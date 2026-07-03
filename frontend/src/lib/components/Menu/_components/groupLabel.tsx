import React from "react";

import { Menu as MenuBase } from "@base-ui/react";
import type { MenuGroupLabelProps as MenuGroupLabelBaseProps } from "@base-ui/react";

import { useComponentSize } from "@lib/components/_shared/contexts/componentSizeContext";
import { getNextTextSize, getTextSizeForSelectableSize } from "@lib/components/_shared/utils/size";
import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/components/_shared/utils/wrapperProps";
import { Typography } from "@lib/components/Typography";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type MenuGroupLabelProps = ComponentWrapperProps<MenuGroupLabelBaseProps>;

export const GroupLabel = React.forwardRef<HTMLDivElement, MenuGroupLabelProps>(function GroupLabel(props, ref) {
    const baseProps = resolveWrapperProps(props);
    const menuItemSize = useComponentSize();
    const labelTextSize = getNextTextSize(getTextSizeForSelectableSize(menuItemSize), -1);

    return (
        <MenuBase.GroupLabel
            {...baseProps}
            ref={ref}
            className={resolveClassNames("menu__item text-neutral-strong!", baseProps.className)}
            render={<Typography as="div" size={labelTextSize} weight="bolder" />}
        />
    );
});
