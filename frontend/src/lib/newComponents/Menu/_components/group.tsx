import React from "react";

import type { MenuGroupProps as MenuGroupBaseProps } from "@base-ui/react";
import { Menu as MenuBase } from "@base-ui/react";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";

export type MenuGroupProps = ComponentWrapperProps<MenuGroupBaseProps>;

// Context to track nested groups.
const GroupDepthContext = React.createContext<number>(0);

export const Group = React.forwardRef<HTMLDivElement, MenuGroupProps>(function Group(props, ref) {
    const baseProps = resolveWrapperProps(props);
    const groupDepth = React.useContext(GroupDepthContext);

    return (
        <MenuBase.Group {...baseProps} ref={ref} style={{ paddingLeft: `${groupDepth}rem`, ...baseProps.style }}>
            <GroupDepthContext.Provider value={groupDepth + 1}>{props.children}</GroupDepthContext.Provider>
        </MenuBase.Group>
    );
});
