import React from "react";

import { Tabs as TabsBase, type TabsListProps as TabsListBaseProps } from "@base-ui/react";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type ListProps = ComponentWrapperProps<TabsListBaseProps> & {
    indicatorPosition?: "start" | "end";
};

export const List = React.forwardRef<HTMLDivElement, ListProps>(function List(props, ref) {
    const { indicatorPosition = "end", ...rest } = props;
    const baseProps = resolveWrapperProps(rest);

    return (
        <TabsBase.List
            {...baseProps}
            ref={ref}
            data-position={indicatorPosition}
            className={resolveClassNames(props.layoutClassName, "relative flex data-[orientation=vertical]:flex-col")}
        >
            {props.children}
            <TabsBase.Indicator className="tabs__indicator bg-accent-strong" />
        </TabsBase.List>
    );
});
