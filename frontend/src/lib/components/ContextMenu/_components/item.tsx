import React from "react";

import type { ContextMenuItemProps } from "@base-ui/react";
import { ContextMenu as ContextMenuBase } from "@base-ui/react";

import type { ComponentWrapperProps } from "@lib/components/_shared/utils/wrapperProps";
import { resolveWrapperProps } from "@lib/components/_shared/utils/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type ItemProps = ComponentWrapperProps<ContextMenuItemProps>;

export const Item = React.forwardRef<HTMLElement, ItemProps>(function Item(props, ref) {
    const baseProps = resolveWrapperProps(props);

    return (
        <ContextMenuBase.Item
            {...baseProps}
            ref={ref}
            className={resolveClassNames("menu__item menu__interactable", baseProps.className)}
        />
    );
});
