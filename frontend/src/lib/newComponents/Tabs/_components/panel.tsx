import { Tabs as TabsBase, type TabsPanelProps as TabsPanelBaseProps } from "@base-ui/react";

export type PanelProps = Omit<TabsPanelBaseProps, "className" | "style">;

export function Panel(props: PanelProps) {
    return <TabsBase.Panel {...props} className="tabs" />;
}
