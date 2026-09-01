import React from "react";

import type { LayoutElement } from "@framework/internal/Dashboard";
import { Typography } from "@lib/components/Typography";

import { DashboardPreview } from "./dashboardPreview";
import { Popover } from "@lib/components/Popover";
import { Info } from "@mui/icons-material";

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

    function handleIndicatorClick(e: React.MouseEvent<HTMLButtonElement>, i: number) {
        e.preventDefault();
        setIndex(i);
    }

    let controlsHeight = 25;
    if (dashboards.length > 1) {
        controlsHeight = 50;
    }

    return (
        <div className="bg-neutral gap-y-4xs flex flex-col" style={{ width, height }}>
            <DashboardPreview width={width} height={height - controlsHeight} layout={current?.layout ?? []} />
            {current && (
                <div className="px-2xs gap-x-2xs flex items-center justify-center">
                    <Typography size="sm" tone="neutral" layoutClassName="truncate">
                        {current.name}{" "}
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
                <>
                    <div className="bottom-3xs gap-x-3xs inset-x-0 flex items-center justify-center">
                        {dashboards.map((dashboard, i) => (
                            <button
                                key={dashboard.id}
                                className={`focusable text-accent-strong-on-emphasis text-body-xs block h-4 w-4 cursor-pointer rounded-full ${i === currentIndex ? "bg-accent-strong-active bg-accent-strong-active-hover" : "bg-accent-strong hover:bg-accent-strong-hover"}`}
                                onClick={(e) => handleIndicatorClick(e, i)}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
