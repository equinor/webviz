import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { ViewLayout } from "@modules/_shared/enums/viewLayout";

export type MultiViewLayoutProps = {
    viewCount: number;
    preferredViewLayout: ViewLayout;
    children: React.ReactNode;
};

export function MultiViewLayout(props: MultiViewLayoutProps): React.ReactNode {
    const { viewCount, preferredViewLayout, children } = props;

    if (viewCount === 0) {
        return <div className="h-full w-full">{children}</div>;
    }

    const isSingleView = viewCount === 1;
    const showHorizontal = isSingleView || preferredViewLayout === ViewLayout.HORIZONTAL;
    const showVertical = !isSingleView && preferredViewLayout === ViewLayout.VERTICAL;
    const showGrid = !isSingleView && preferredViewLayout === ViewLayout.GRID;

    const numCols = Math.ceil(Math.sqrt(viewCount));
    const numRows = Math.ceil(viewCount / numCols);
    const gridStyle: React.CSSProperties | undefined = showGrid
        ? { gridTemplateColumns: `repeat(${numCols}, 1fr)`, gridTemplateRows: `repeat(${numRows}, 1fr)` }
        : undefined;

    const containerClasses = {
        "flex flex-row gap-3xs": showHorizontal,
        "flex flex-col gap-3xs": showVertical,
        "grid gap-3xs": showGrid,
    };
    const childClasses = {
        "flex-1 shrink-0 min-w-0": showHorizontal,
        "flex-1 shrink-0 min-h-0": showVertical,
        "min-h-0 min-w-0": showGrid,
    };

    return (
        <div className={resolveClassNames("h-full w-full", containerClasses)} style={gridStyle}>
            {React.Children.map(children, (child) => (
                <div className={resolveClassNames("overflow-hidden p-0.5", childClasses)}>{child}</div>
            ))}
        </div>
    );
}
