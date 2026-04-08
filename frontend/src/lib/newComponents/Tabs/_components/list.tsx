import { Tabs as TabsBase, type TabsListProps as TabsListBaseProps } from "@base-ui/react";

export type ListProps = Omit<TabsListBaseProps, "className" | "style"> & {
    indicatorPosition?: "start" | "end";
};

export function List(props: ListProps) {
    return (
        <TabsBase.List
            data-position={props.indicatorPosition}
            {...props}
            className="relative flex data-[orientation=vertical]:flex-col"
        >
            {props.children}
            <TabsBase.Indicator className="tabs__indicator bg-fill-accent-strong" />
        </TabsBase.List>
    );
}
