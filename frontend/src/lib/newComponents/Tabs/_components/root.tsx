import { Tabs as TabsBase, type TabsRootProps as TabsRootBaseProps } from "@base-ui/react";

export type RootProps = Omit<TabsRootBaseProps, "className" | "style">;

export function Root(props: RootProps) {
    return <TabsBase.Root {...props} className="tabs" />;
}
