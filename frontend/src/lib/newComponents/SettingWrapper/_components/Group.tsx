import React from "react";

import { useElementSize } from "@lib/hooks/useElementSize";

export type GroupProps = {
    /** The SettingWrapper items to render inside the group. */
    children?: React.ReactNode;
};

export type Layout = "inline" | "stacked";

const LAYOUT_BREAKPOINT = 350;

export const LayoutContext = React.createContext<Layout>("inline");

export const Group = React.forwardRef<HTMLDivElement, GroupProps>(function Group(props, ref) {
    const [layout, setLayout] = React.useState<Layout>("stacked");
    const localRef = React.useRef<HTMLDivElement>(null);
    const size = useElementSize(localRef);

    React.useImperativeHandle(ref, () => localRef.current as HTMLDivElement, []);

    React.useEffect(
        function updateLayout() {
            if (size.width > LAYOUT_BREAKPOINT) {
                setLayout("inline");
            } else {
                setLayout("stacked");
            }
        },
        [size.width],
    );

    return (
        <LayoutContext.Provider value={layout}>
            <div
                ref={localRef}
                className="gap-x-md grid grid-cols-[auto_1fr_auto]"
            >
                {props.children}
            </div>
        </LayoutContext.Provider>
    );
});
