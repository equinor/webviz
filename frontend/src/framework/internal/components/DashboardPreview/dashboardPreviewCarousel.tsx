import React from "react";

import { ChevronLeft, ChevronRight } from "@mui/icons-material";

import type { LayoutElement } from "@framework/internal/Dashboard";
import { Button } from "@lib/components/Button";
import { Typography } from "@lib/components/Typography";

import { DashboardPreview } from "./dashboardPreview";

export type DashboardPreviewCarouselItem = {
    id: string;
    name: string;
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

    function handlePrevious() {
        setIndex((prev) => (prev - 1 + dashboards.length) % dashboards.length);
    }

    function handleNext() {
        setIndex((prev) => (prev + 1) % dashboards.length);
    }

    return (
        <div className="relative" style={{ width, height }}>
            <DashboardPreview width={width} height={height} layout={current?.layout ?? []} />
            {current && (
                <div className="bg-canvas/70 absolute inset-x-0 top-0 flex items-center justify-center px-2xs py-3xs">
                    <Typography size="sm" tone="neutral" layoutClassName="truncate">
                        {current.name}
                    </Typography>
                </div>
            )}
            {dashboards.length > 1 && (
                <>
                    <Button
                        iconOnly
                        round
                        size="small"
                        variant="ghost"
                        tone="neutral"
                        onClick={handlePrevious}
                        layoutClassName="bg-canvas/70 absolute top-1/2 left-3xs -translate-y-1/2"
                    >
                        <ChevronLeft fontSize="inherit" />
                    </Button>
                    <Button
                        iconOnly
                        round
                        size="small"
                        variant="ghost"
                        tone="neutral"
                        onClick={handleNext}
                        layoutClassName="bg-canvas/70 absolute top-1/2 right-3xs -translate-y-1/2"
                    >
                        <ChevronRight fontSize="inherit" />
                    </Button>
                    <div className="absolute inset-x-0 bottom-3xs flex items-center justify-center">
                        <Typography
                            size="xs"
                            tone="neutral"
                            layoutClassName="bg-canvas/70 rounded-full px-2xs py-4xs"
                        >
                            {currentIndex + 1} / {dashboards.length}
                        </Typography>
                    </div>
                </>
            )}
        </div>
    );
}
