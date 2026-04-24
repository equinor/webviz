import type React from "react";

import { Tabs as TabsBase, type TabsTabProps as TabsTabBaseProps } from "@base-ui/react";

export type TabProps = Omit<TabsTabBaseProps, "className" | "style" | "children"> & {
    children?: React.ReactNode | ((props: { isActive: boolean }) => React.ReactNode);
};

export function Tab({ children, ...props }: TabProps) {
    return (
        <TabsBase.Tab
            {...props}
            className="tabs__tab"
            render={(htmlProps, state) => (
                <button {...htmlProps}>
                    {typeof children === "function" ? children({ isActive: state.active }) : children}
                </button>
            )}
        />
    );
}
