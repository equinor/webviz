// Element ids linking each dashboard tab (bottom bar) to its tabpanel (content area)

export function makeDashboardTabId(dashboardId: string): string {
    return `dashboard-tab-${dashboardId}`;
}

export function makeDashboardTabPanelId(dashboardId: string): string {
    return `dashboard-tabpanel-${dashboardId}`;
}
