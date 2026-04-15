import { Tabs as TabsBase, type TabsListProps as TabsListBaseProps } from "@base-ui/react";

export type ListProps = Omit<TabsListBaseProps, "className" | "style"> & {
    indicatorPosition?: "start" | "end";
};

const DEFAULT_PROPS = {
    indicatorPosition: "end",
} satisfies Partial<ListProps>;

export function List(props: ListProps) {
    const { indicatorPosition = DEFAULT_PROPS.indicatorPosition, ...restProps } = props;

    return (
        <TabsBase.List
            data-position={indicatorPosition}
            {...restProps}
            className="relative flex data-[orientation=vertical]:flex-col"
        >
            {props.children}
            <TabsBase.Indicator className="tabs__indicator bg-accent-strong" />
        </TabsBase.List>
    );
}
