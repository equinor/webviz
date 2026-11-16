import { atom } from "jotai";

import type { DashboardSettingsService } from "./DashboardSettingsService";

/**
 * The dashboard settings service for the dashboard a module instance belongs to. Set by the Dashboard on
 * each module instance's own atom store - so module atoms (see `adapters/jotai.ts`) can reach it without
 * being handed the service - and null in any other store.
 */
export const DashboardSettingsServiceAtom = atom<DashboardSettingsService | null>(null);
