import React from "react";

import { Tabs as TabsBase, type TabsRootProps as TabsRootBaseProps } from "@base-ui/react";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type RootProps = ComponentWrapperProps<Omit<TabsRootBaseProps, "ref">>;

export const Root = React.forwardRef<HTMLDivElement, RootProps>(function Root(props, ref) {
    const baseProps = resolveWrapperProps(props);

    return <TabsBase.Root {...baseProps} ref={ref} className={resolveClassNames(props.layoutClassName, "tabs")} />;
});
