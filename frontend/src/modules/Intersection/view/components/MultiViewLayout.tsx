import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { PreferredViewLayout } from "@modules/Intersection/typesAndEnums";

export type MultiViewLayoutProps = {
    viewCount: number;
    preferredViewLayout: PreferredViewLayout;
    children: React.ReactNode;
};

export function MultiViewLayout(props: MultiViewLayoutProps): React.ReactNode {
    const { viewCount, preferredViewLayout, children } = props;

    if (viewCount === 0) {
        return <div className="w-full h-full">{children}</div>;
    }

    const isSingleView = viewCount === 1;
    const showHorizontal = isSingleView || preferredViewLayout === PreferredViewLayout.HORIZONTAL;
    const showVertical = !isSingleView && preferredViewLayout === PreferredViewLayout.VERTICAL;
    const showGrid = !isSingleView && preferredViewLayout === PreferredViewLayout.GRID;

    const numCols = Math.ceil(Math.sqrt(viewCount));
    const numRows = Math.ceil(viewCount / numCols);
    const gridStyle: React.CSSProperties | undefined = showGrid
        ? { gridTemplateColumns: `repeat(${numCols}, 1fr)`, gridTemplateRows: `repeat(${numRows}, 1fr)` }
        : undefined;

    const containerClasses = {
        "flex flex-row gap-4": showHorizontal,
        "flex flex-col gap-4": showVertical,
        "grid gap-4": showGrid,
    };
    const childClasses = {
        "flex-1 shrink-0 min-w-0": showHorizontal,
        "flex-1 shrink-0 min-h-0": showVertical,
        "min-h-0 min-w-0": showGrid,
    };

    return (
        <div className={resolveClassNames("w-full h-full", containerClasses)} style={gridStyle}>
            {React.Children.map(children, (child) => (
                <div className={resolveClassNames("overflow-hidden", childClasses)}>{child}</div>
            ))}
        </div>
    );
}
