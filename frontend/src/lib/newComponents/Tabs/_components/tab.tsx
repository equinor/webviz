import React from "react";

import { Tabs as TabsBase, type TabsTabProps as TabsTabBaseProps } from "@base-ui/react";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type TabProps = ComponentWrapperProps<Omit<TabsTabBaseProps, "children">> & {
    /** The tab label content. Can be a render function that receives `{ isActive }`. */
    children?: React.ReactNode | ((props: { isActive: boolean }) => React.ReactNode);
};

export const Tab = React.forwardRef<HTMLButtonElement, TabProps>(function Tab(props, ref) {
    const baseProps = resolveWrapperProps(props, "children");

    // The "tabs__*" classes can be found in the tabs.css file in the styles/components folder
    return (
        <TabsBase.Tab
            {...baseProps}
            ref={ref}
            className={resolveClassNames(props.layoutClassName, "tabs__tab")}
            render={(htmlProps, state) => (
                <button {...htmlProps}>
                    {typeof props.children === "function" ? props.children({ isActive: state.active }) : props.children}
                </button>
            )}
        />
    );
});
