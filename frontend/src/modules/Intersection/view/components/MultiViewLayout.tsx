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

    if (viewCount <= 1) {
        return <div className="w-full h-full">{children}</div>;
    }

    const isHorizontal = preferredViewLayout === PreferredViewLayout.HORIZONTAL;
    const isVertical = preferredViewLayout === PreferredViewLayout.VERTICAL;
    const isGrid = preferredViewLayout === PreferredViewLayout.GRID;

    const numCols = Math.ceil(Math.sqrt(viewCount));
    const numRows = Math.ceil(viewCount / numCols);
    const gridStyle: React.CSSProperties | undefined = isGrid
        ? { gridTemplateColumns: `repeat(${numCols}, 1fr)`, gridTemplateRows: `repeat(${numRows}, 1fr)` }
        : undefined;

    const containerClasses = {
        "flex flex-row": isHorizontal,
        "flex flex-col": isVertical,
        grid: isGrid,
    };
    const childClasses = {
        "flex-1 shrink-0 min-w-0": isHorizontal,
        "flex-1 shrink-0 min-h-0": isVertical,
        "min-h-0 min-w-0": isGrid,
    };

    return (
        <div className={resolveClassNames("w-full h-full gap-4", containerClasses)} style={gridStyle}>
            {React.Children.map(children, (child) => (
                <div className={resolveClassNames("overflow-hidden", childClasses)}>{child}</div>
            ))}
        </div>
    );
}
