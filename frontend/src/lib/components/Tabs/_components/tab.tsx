import React from "react";

import { Tabs as TabsBase, type TabsTabProps as TabsTabBaseProps } from "@base-ui/react";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/components/_shared/utils/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type TabProps = ComponentWrapperProps<Omit<TabsTabBaseProps, "children">> & {
    /** The tab label content. Can be a render function that receives `{ isActive }`. */
    children?: React.ReactNode | ((props: { isActive: boolean }) => React.ReactNode);
    /**
     * The DOM element to render the tab as. Use "div" when the tab needs to contain another
     * interactive element (e.g. a menu trigger button), since a `<button>` cannot contain a
     * nested `<button>`. @default "button"
     */
    as?: "button" | "div";
};

export const Tab = React.forwardRef<HTMLButtonElement | HTMLDivElement, TabProps>(function Tab(props, ref) {
    const { as = "button", ...rest } = props;
    const baseProps = resolveWrapperProps(rest, "children");

    // The "tabs__*" classes can be found in the tabs.css file in the styles/components folder
    return (
        <TabsBase.Tab
            {...baseProps}
            nativeButton={as === "button"}
            ref={ref}
            className={resolveClassNames(baseProps.className, "tabs__tab")}
            render={(htmlProps, state) => {
                const content =
                    typeof props.children === "function" ? props.children({ isActive: state.active }) : props.children;
                if (as === "div") {
                    return <div {...htmlProps}>{content}</div>;
                }
                return <button {...htmlProps}>{content}</button>;
            }}
        />
    );
});
