import type React from "react";

import { Tabs as TabsBase, type TabsTabProps as TabsTabBaseProps } from "@base-ui/react";

export type TabProps = Omit<TabsTabBaseProps, "className" | "style"> & {
    children?: React.ReactNode | ((props: { isActive: boolean }) => React.ReactNode);
};

export function Tab(props: TabProps) {
    return (
        <TabsBase.Tab
            {...props}
            className="tabs__tab text-body-md font-bolder p-space-xs h-selectable-md hover:bg-fill-accent-hover data-active:text-text-accent-subtle flex cursor-pointer items-center justify-center"
            render={(htmlProps, state) => (
                <button {...htmlProps}>
                    {typeof props.children === "function" ? props.children({ isActive: state.active }) : props.children}
                </button>
            )}
        />
    );
}
