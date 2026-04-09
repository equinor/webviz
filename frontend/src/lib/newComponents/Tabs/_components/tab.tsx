import type React from "react";

import { Tabs as TabsBase, type TabsTabProps as TabsTabBaseProps } from "@base-ui/react";

export type TabProps = Omit<TabsTabBaseProps, "className" | "style" | "children"> & {
    children?: React.ReactNode | ((props: { isActive: boolean }) => React.ReactNode);
};

export function Tab({ children, ...props }: TabProps) {
    return (
        <TabsBase.Tab
            {...props}
            className="tabs__tab font-bolder p-vertical-xs hover:bg-accent-hover data-active:text-accent-subtle flex cursor-pointer items-center justify-center"
            render={(htmlProps, state) => (
                <button {...htmlProps}>
                    {typeof children === "function" ? children({ isActive: state.active }) : children}
                </button>
            )}
        />
    );
}
