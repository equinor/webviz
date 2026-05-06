import React from "react";

import { Tabs as TabsBase, type TabsTabProps as TabsTabBaseProps } from "@base-ui/react";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type TabProps = ComponentWrapperProps<Omit<TabsTabBaseProps, "children" | "ref">> & {
    children?: React.ReactNode | ((props: { isActive: boolean }) => React.ReactNode);
};

export const Tab = React.forwardRef<HTMLButtonElement, TabProps>(function Tab(props, ref) {
    const baseProps = resolveWrapperProps(props) as Omit<TabsTabBaseProps, "children" | "ref">;

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
