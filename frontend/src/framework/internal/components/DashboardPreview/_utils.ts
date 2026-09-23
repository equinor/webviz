import type { Dashboard } from "@framework/internal/Dashboard";

import type { DashboardPreviewCarouselItem } from "./dashboardPreviewCarousel";

export function dashboardsToPreviewCarouselItems(dashboards: Dashboard[]): DashboardPreviewCarouselItem[] {
    return dashboards.map((dashboard) => ({
        id: dashboard.getId(),
        name: dashboard.getMetadata().name,
        description: dashboard.getMetadata().description,
        layout: dashboard.getLayoutForPreview(),
    }));
}
