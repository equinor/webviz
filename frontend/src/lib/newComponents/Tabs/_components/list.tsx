import React from "react";

import { Tabs as TabsBase, type TabsListProps as TabsListBaseProps } from "@base-ui/react";

import { useComponentSize } from "@lib/newComponents/_shared/contexts/componentSizeContext";
import type { SelectableSize } from "@lib/newComponents/_shared/utils/size";
import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type ListProps = ComponentWrapperProps<TabsListBaseProps> & {
    indicatorPosition?: "start" | "end";
    size?: SelectableSize;
};

export const List = React.forwardRef<HTMLDivElement, ListProps>(function List(props, ref) {
    const { indicatorPosition = "end", ...rest } = props;
    const baseProps = resolveWrapperProps(rest, "size");
    const size = useComponentSize(props);

    // The "tabs__*" classes can be found in the tabs.css file in the styles/components folder
    return (
        <TabsBase.List
            {...baseProps}
            ref={ref}
            data-position={indicatorPosition}
            data-size={size}
            className={resolveClassNames(props.layoutClassName, "tabs__list")}
        >
            {props.children}
            <TabsBase.Indicator className="tabs__indicator" />
        </TabsBase.List>
    );
});
