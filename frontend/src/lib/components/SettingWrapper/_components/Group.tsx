import { useElementSize } from "@lib/hooks/useElementSize";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
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

    const children = React.Children.map(props.children, (child, index) => (
        <div
            key={index}
            className={resolveClassNames(
                "px-horizontal-xs py-vertical-2xs col-span-2 grid grid-cols-subgrid",
                index % 2 === 0 ? "bg-canvas" : "",
            )}
        >
            {child}
        </div>
    ));

    return (
        <LayoutContext.Provider value={layout}>
            <div
                ref={localRef}
                className={resolveClassNames("gap-x-horizontal-md gap-y-vertical grid grid-cols-[auto_1fr]")}
            >
                {children}
            </div>
        </LayoutContext.Provider>
    );
});
