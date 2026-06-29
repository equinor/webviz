import React from "react";

import { useElementSize } from "@lib/hooks/useElementSize";

export type PanelProps = {
    /** The Setting.Field items to render inside the panel. */
    children?: React.ReactNode;
};

export type Layout = "inline" | "stacked";

const LAYOUT_BREAKPOINT = 350;

export const LayoutContext = React.createContext<Layout>("inline");

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(function Panel(props, ref) {
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
                data-in-group
                className="gap-x-md grid grid-cols-[auto_1fr_auto]"
            >
                {props.children}
            </div>
        </LayoutContext.Provider>
    );
});
