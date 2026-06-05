import React from "react";

import { Tabs as TabsBase, type TabsPanelProps as TabsPanelBaseProps } from "@base-ui/react";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type PanelProps = ComponentWrapperProps<Omit<TabsPanelBaseProps, "ref">>;

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(function Panel(props, ref) {
    const baseProps = resolveWrapperProps(props) as Omit<TabsPanelBaseProps, "ref">;

    return <TabsBase.Panel {...baseProps} ref={ref} className={resolveClassNames(props.layoutClassName, "tabs")} />;
});
