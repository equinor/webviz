import React from "react";

import { ChevronLeft, ChevronRight, Info } from "@mui/icons-material";

import type { LayoutElement } from "@framework/internal/Dashboard";
import { Button } from "@lib/components/Button";
import { Popover } from "@lib/components/Popover";
import { Typography } from "@lib/components/Typography";
import { useHorizontalStepScroll } from "@lib/hooks/useHorizontalStepScroll";

import { DashboardPreview } from "./dashboardPreview";

export type DashboardPreviewCarouselItem = {
    id: string;
    name: string;
    description?: string;
    layout: LayoutElement[];
};

export type DashboardPreviewCarouselProps = {
    dashboards: DashboardPreviewCarouselItem[];
    width: number;
    height: number;
};

export function DashboardPreviewCarousel(props: DashboardPreviewCarouselProps): React.ReactNode {
    const { dashboards, width, height } = props;
    const [index, setIndex] = React.useState(0);

    const currentIndex = dashboards.length > 0 ? index % dashboards.length : 0;
    const current = dashboards[currentIndex];

    const { scrollContainerRef, contentRef, scrollItemIntoView } = useHorizontalStepScroll({
        itemSelector: "[data-carousel-indicator]",
    });

    // Keep the active indicator visible when the strip of indicators overflows - whether the
    // selection changed via the chevrons, an indicator click, or the dashboard set changed.
    React.useEffect(
        function keepActiveIndicatorInView() {
            scrollItemIntoView(currentIndex);
        },
        [currentIndex, dashboards.length, scrollItemIntoView],
    );

    function handleIndicatorClick(e: React.MouseEvent<HTMLButtonElement>, i: number) {
        e.preventDefault();
        setIndex(i);
    }

    let controlsHeight = 30;
    if (dashboards.length > 1) {
        controlsHeight = 60;
    }

    return (
        <div className="bg-neutral gap-y-2xs flex flex-col" style={{ width, height }}>
            <DashboardPreview width={width} height={height - controlsHeight} layout={current?.layout ?? []} />
            {current && (
                <div className="px-2xs gap-x-2xs flex items-center justify-center">
                    <Typography size="sm" tone="neutral" layoutClassName="truncate" title={current.name}>
                        {current.name}
                    </Typography>
                    {current.description && (
                        <Popover.Root>
                            <Popover.Trigger tone="accent" iconOnly size="small" variant="ghost">
                                <Info style={{ fontSize: 16 }} />
                            </Popover.Trigger>
                            <Popover.Popup>
                                <Popover.Content>{current.description}</Popover.Content>
                            </Popover.Popup>
                        </Popover.Root>
                    )}
                </div>
            )}
            {dashboards.length > 1 && (
                <div className="px-2xs pb-3xs gap-x-3xs flex items-center justify-center">
                    <Button
                        iconOnly
                        variant="ghost"
                        tone="neutral"
                        size="small"
                        disabled={currentIndex === 0}
                        layoutClassName={currentIndex === 0 ? "invisible" : ""}
                        onClick={() => setIndex(currentIndex - 1)}
                    >
                        <ChevronLeft fontSize="small" />
                    </Button>
                    <div
                        ref={scrollContainerRef}
                        className="min-w-0 scrollbar-none overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                    >
                        <div ref={contentRef} className="gap-x-3xs flex w-max items-center">
                            {dashboards.map((dashboard, i) => (
                                <button
                                    key={dashboard.id}
                                    data-carousel-indicator
                                    className={`focusable text-body-xs block h-4 w-4 shrink-0 cursor-pointer rounded-full ${i === currentIndex ? "bg-accent-strong- bg-accent-strong-active text-accent-strong-on-emphasis" : "bg-accent hover:bg-accent-hover text-accent-on-emphasis"}`}
                                    onClick={(e) => handleIndicatorClick(e, i)}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                    </div>
                    <Button
                        iconOnly
                        variant="ghost"
                        tone="neutral"
                        size="small"
                        disabled={currentIndex === dashboards.length - 1}
                        layoutClassName={currentIndex === dashboards.length - 1 ? "invisible" : ""}
                        onClick={() => setIndex(currentIndex + 1)}
                    >
                        <ChevronRight fontSize="small" />
                    </Button>
                </div>
            )}
        </div>
    );
}
