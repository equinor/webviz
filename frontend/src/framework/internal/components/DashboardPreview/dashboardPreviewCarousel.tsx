import React from "react";

import { ChevronLeft, ChevronRight, PushPin, PushPinOutlined } from "@mui/icons-material";

import type { DashboardPreviewItem } from "@framework/internal/WorkbenchSession/utils/WorkbenchSessionDataContainer";
import { Button } from "@lib/components/Button";
import { Tooltip } from "@lib/components/Tooltip";
import { Typography } from "@lib/components/Typography";
import { useHorizontalStepScroll } from "@lib/hooks/useHorizontalStepScroll";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { DashboardPreview } from "./dashboardPreview";

export type DashboardPreviewCarouselProps = {
    dashboards: DashboardPreviewItem[];
    width: number;
    height: number;
    /**
     * Which dashboard is currently marked to open first the next time this snapshot
     * is opened. Also seeds which dashboard the carousel starts browsing on. Deliberately
     * independent from there on - browsing with the chevrons/indicators only moves which one is
     * shown, never this; only the pin toggle (rendered when onActiveDashboardIdChange is given)
     * changes it. Omit both props to hide the toggle and just start browsing from the first
     * dashboard.
     */
    activeDashboardId?: string;
    onActiveDashboardIdChange?: (dashboardId: string) => void;
};

export function DashboardPreviewCarousel(props: DashboardPreviewCarouselProps): React.ReactNode {
    // Lazy initializer: only ever used to pick where the carousel starts browsing on mount, not to
    // react to activeDashboardId/dashboards changing afterward.
    const [index, setIndex] = React.useState(() => {
        if (!props.activeDashboardId) {
            return 0;
        }
        const initialIndex = props.dashboards.findIndex((d) => d.id === props.activeDashboardId);
        return initialIndex === -1 ? 0 : initialIndex;
    });

    const currentIndex = props.dashboards.length > 0 ? index % props.dashboards.length : 0;
    const current = props.dashboards[currentIndex];

    const { scrollContainerRef, contentRef, scrollItemIntoView } = useHorizontalStepScroll({
        itemSelector: "[data-carousel-indicator]",
    });

    // Keep the active indicator visible when the strip of indicators overflows - whether the
    // selection changed via the chevrons, an indicator click, or the dashboard set changed.
    React.useEffect(
        function keepActiveIndicatorInView() {
            scrollItemIntoView(currentIndex);
        },
        [currentIndex, props.dashboards.length, scrollItemIntoView],
    );

    function handleIndicatorClick(e: React.MouseEvent<HTMLButtonElement>, i: number) {
        e.preventDefault();
        setIndex(i);
    }

    let controlsHeight = 30;
    if (props.dashboards.length > 1) {
        controlsHeight = 60;
    }

    const tooltipContent = `${current?.name ?? ""}\n${current?.description ? `⎯⎯⎯⎯⎯\n${current.description}` : ""}`;

    const isCurrentActive = current !== undefined && current.id === props.activeDashboardId;
    const activeIndex = props.dashboards.findIndex((d) => d.id === props.activeDashboardId);

    return (
        <div className="bg-neutral gap-y-2xs flex flex-col" style={{ width: props.width, height: props.height }}>
            <div className="relative" style={{ width: props.width, height: props.height - controlsHeight }}>
                <DashboardPreview
                    width={props.width}
                    height={props.height - controlsHeight}
                    layout={current?.layout ?? []}
                />
                {current && props.onActiveDashboardIdChange && (
                    <div className="top-3xs right-3xs absolute">
                        <Tooltip
                            content={
                                isCurrentActive
                                    ? `"${current.name}" opens first when opening`
                                    : `Open "${current.name}" first when opened`
                            }
                        >
                            <Button
                                aria-label={
                                    isCurrentActive
                                        ? `"${current.name}" opens first when opening`
                                        : `Open "${current.name}" first when opened`
                                }
                                iconOnly
                                variant="contained"
                                tone={isCurrentActive ? "accent" : "neutral"}
                                size="small"
                                onClick={() => props.onActiveDashboardIdChange?.(current.id)}
                            >
                                {isCurrentActive ? (
                                    <PushPin style={{ fontSize: 16 }} />
                                ) : (
                                    <PushPinOutlined style={{ fontSize: 16 }} />
                                )}
                            </Button>
                        </Tooltip>
                    </div>
                )}
            </div>
            {current && (
                <div className="px-2xs gap-x-2xs flex items-center justify-center">
                    <Typography size="sm" tone="neutral" layoutClassName="truncate" title={tooltipContent}>
                        {current.name}
                    </Typography>
                </div>
            )}
            {props.dashboards.length > 1 && (
                <div className="px-2xs pb-3xs gap-x-3xs flex items-center justify-center">
                    <Tooltip content="Previous dashboard">
                        <Button
                            aria-label="Previous dashboard"
                            iconOnly
                            variant="ghost"
                            tone="neutral"
                            size="small"
                            disabled={currentIndex === 0}
                            onClick={() => setIndex(currentIndex - 1)}
                        >
                            <ChevronLeft fontSize="small" />
                        </Button>
                    </Tooltip>
                    <div
                        ref={scrollContainerRef}
                        className="min-w-0 scrollbar-none overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                    >
                        <div ref={contentRef} className="gap-x-3xs flex w-max items-center">
                            {props.dashboards.map((dashboard, i) => (
                                <button
                                    aria-label={`Show dashboard "${dashboard.name}"`}
                                    aria-current={i === currentIndex ? "true" : undefined}
                                    key={dashboard.id}
                                    data-carousel-indicator
                                    className={resolveClassNames(
                                        "focusable text-body-xs flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full",
                                        {
                                            "bg-accent-active": i === activeIndex,
                                            "bg-accent-strong text-accent-strong-on-emphasis": i === currentIndex,
                                            "bg-accent hover:bg-accent-hover text-accent-on-emphasis":
                                                i !== activeIndex && i !== currentIndex,
                                        },
                                    )}
                                    onClick={(e) => handleIndicatorClick(e, i)}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                    </div>
                    <Tooltip content="Next dashboard">
                        <Button
                            aria-label="Next dashboard"
                            iconOnly
                            variant="ghost"
                            tone="neutral"
                            size="small"
                            disabled={currentIndex === props.dashboards.length - 1}
                            onClick={() => setIndex(currentIndex + 1)}
                        >
                            <ChevronRight fontSize="small" />
                        </Button>
                    </Tooltip>
                </div>
            )}
        </div>
    );
}
