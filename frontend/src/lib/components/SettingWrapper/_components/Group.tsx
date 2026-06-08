import { useElementSize } from "@lib/hooks/useElementSize";
import React from "react";

export type GroupProps = {
    children?: React.ReactNode;
};

export type Layout = "inline" | "stacked";

const LAYOUT_BREAKPOINT = 300;

export const LayoutContext = React.createContext<Layout>("inline");

export const Group = React.forwardRef<HTMLDivElement, GroupProps>((props, ref) => {
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
            <div ref={localRef} className="gap-y-vertical-sm gap-x-horizontal-md grid grid-cols-[auto_1fr]">
                {props.children}
            </div>
        </LayoutContext.Provider>
    );
});
