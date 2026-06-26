import React from "react";

import { Tabs as TabsBase, type TabsPanelProps as TabsPanelBaseProps } from "@base-ui/react";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

/** Accepts all standard tabs panel props except `className`, `render`, and `style`. Use `layoutClassName` for layout adjustments. */
export type PanelProps = ComponentWrapperProps<TabsPanelBaseProps>;

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(function Panel(props, ref) {
    const baseProps = resolveWrapperProps(props);

    return <TabsBase.Panel {...baseProps} ref={ref} className={resolveClassNames(baseProps.className, "tabs")} />;
});
