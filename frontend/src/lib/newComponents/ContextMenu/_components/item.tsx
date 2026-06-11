import type { ContextMenuItemProps } from "@base-ui/react";
import { ContextMenu as ContextMenuBase } from "@base-ui/react";

import type { ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { resolveWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type ItemProps = ComponentWrapperProps<ContextMenuItemProps>;

export function Item(props: ItemProps) {
    const baseProps = resolveWrapperProps(props);

    return (
        <ContextMenuBase.Item
            {...baseProps}
            className={resolveClassNames("menu__item menu__interactable", baseProps.className)}
        />
    );
}
