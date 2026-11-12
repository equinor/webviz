import React from "react";

import { RailMarker } from "./Rails";
import type { ItemRow, RailLayout, TreeRow } from "./treeModel";
import { ROW_HEIGHT_PX, isSource } from "./treeModel";
import { ItemIcon, ItemName } from "./TreeRowViews";

const INDENT_PX = 16;

type PinnedRow = {
    row: ItemRow;
    rowIndex: number;
    visibleHeight: number;
    offset: number;
};

type PinnedRowsResult = {
    pinnedRows: PinnedRow[];
    /** Height of the pinned rows - the top of the visible tree below them */
    boundary: number;
};

/*
 * Stacked like CSS position: sticky, in a single pass in tree order: an expanded container is pinned as soon as its own
 * top crosses the current boundary (top of the viewport plus what is already pinned). It stays pinned, clipped from the
 * top, while its descendants are below the boundary. Shared settings are not pinned here - they get a label on their
 * rail instead (see RailLabel).
 */
function computePinnedRows(rows: TreeRow[], scrollTop: number): PinnedRowsResult {
    const pinnedRows: PinnedRow[] = [];
    let boundary = 0;

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        if (rowIndex * ROW_HEIGHT_PX >= scrollTop + boundary) {
            break;
        }
        const row = rows[rowIndex];
        if (row.type !== "item" || !row.isContainer || row.contentEndRowIndex === null) {
            continue;
        }

        const contentBottom = (row.contentEndRowIndex + 1) * ROW_HEIGHT_PX;
        const visibleHeight = Math.min(ROW_HEIGHT_PX, contentBottom - (scrollTop + boundary));
        if (visibleHeight <= 0) {
            continue;
        }
        pinnedRows.push({ row, rowIndex, visibleHeight, offset: boundary });
        boundary += visibleHeight;
    }

    return { pinnedRows, boundary };
}

export type StickyHeadersProps = {
    rows: TreeRow[];
    railLayout: RailLayout;
    scrollContainer: HTMLElement | null;
    gutterWidth: number;
    hotSourceIds: Set<string>;
    onHoverChange: (itemId: string | null) => void;
};

export function StickyHeaders(props: StickyHeadersProps): React.ReactNode {
    const { scrollContainer } = props;
    const [scrollTop, setScrollTop] = React.useState(0);
    const [viewportWidth, setViewportWidth] = React.useState(0);

    React.useEffect(
        function trackScrollPosition() {
            if (!scrollContainer) {
                return;
            }
            function update() {
                if (!scrollContainer) {
                    return;
                }
                // eslint-disable-next-line @eslint-react/set-state-in-effect -- measured from the DOM
                setScrollTop(scrollContainer.scrollTop);
                // eslint-disable-next-line @eslint-react/set-state-in-effect -- measured from the DOM
                setViewportWidth(scrollContainer.clientWidth);
            }
            update();
            scrollContainer.addEventListener("scroll", update);
            const resizeObserver = new ResizeObserver(update);
            resizeObserver.observe(scrollContainer);
            return () => {
                scrollContainer.removeEventListener("scroll", update);
                resizeObserver.disconnect();
            };
        },
        [scrollContainer],
    );

    const { pinnedRows } = computePinnedRows(props.rows, scrollTop);

    if (pinnedRows.length === 0) {
        return null;
    }

    function handleClick(pinned: PinnedRow) {
        scrollContainer?.scrollTo({ top: pinned.rowIndex * ROW_HEIGHT_PX - pinned.offset });
    }

    return (
        <div className="pointer-events-none absolute top-0 left-0 z-20" style={{ width: viewportWidth }}>
            {pinnedRows.map((pinned) => {
                const { row } = pinned;
                const rail = props.railLayout.railsBySourceId.get(row.key);
                const isPinnedSource = isSource(row.item) && rail !== undefined;
                const color = isPinnedSource ? rail.color : undefined;
                return (
                    <div key={row.key} className="overflow-hidden" style={{ height: pinned.visibleHeight }}>
                        <div
                            className="flex items-stretch"
                            style={{ transform: `translateY(${pinned.visibleHeight - ROW_HEIGHT_PX}px)` }}
                        >
                            <div className="relative shrink-0" style={{ width: props.gutterWidth }}>
                                {isPinnedSource && (
                                    <RailMarker
                                        rail={rail}
                                        isOrigin
                                        isHot={props.hotSourceIds.has(row.key)}
                                        top={ROW_HEIGHT_PX / 2}
                                    />
                                )}
                            </div>
                            <div
                                title={`Scroll to ${row.item.getItemDelegate().getName()}`}
                                className="bg-canvas gap-x-xs px-xs pointer-events-auto flex min-w-0 grow cursor-pointer items-center shadow-sm"
                                style={{ height: ROW_HEIGHT_PX }}
                                onClick={() => handleClick(pinned)}
                                onMouseEnter={() => props.onHoverChange(row.key)}
                                onMouseLeave={() => props.onHoverChange(null)}
                            >
                                {/* Same width as the guides and caret of the row, so the pinned row lines up with it */}
                                <span className="shrink-0" style={{ width: row.depth * INDENT_PX + 16 }} />
                                <ItemIcon item={row.item} color={color} />
                                <ItemName item={row.item} color={color} />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
