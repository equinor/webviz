import type { Dashboard } from "@framework/internal/Dashboard";
import type { DashboardPreviewItem } from "@framework/internal/WorkbenchSession/utils/WorkbenchSessionDataContainer";

export function dashboardsToPreviewItems(dashboards: Dashboard[]): DashboardPreviewItem[] {
    return dashboards.map((dashboard) => ({
        id: dashboard.getId(),
        name: dashboard.getMetadata().name,
        description: dashboard.getMetadata().description,
        layout: dashboard.getLayoutForPreview(),
    }));
}
