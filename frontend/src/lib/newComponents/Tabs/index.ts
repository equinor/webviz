import { List, type ListProps } from "./_components/list";
import { Panel, type PanelProps } from "./_components/panel";
import { Root, type RootProps } from "./_components/root";
import { Tab, type TabProps } from "./_components/tab";

export const Tabs = {
    Root,
    List,
    Tab,
    Panel,
};

export type TabsProps = {
    Root: RootProps;
    List: ListProps;
    Tab: TabProps;
    Panel: PanelProps;
};
