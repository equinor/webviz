import type { SettingSectionProps } from "@lib/components/Setting";

import type { SetupField, SetupReadiness } from "../utils/setupReadiness";

export const NUMBER_INPUT_DEBOUNCE_MS = 500;

export enum SettingsSection {
    DATA_AND_VALUATION = "Data and valuation",
    PRICES = "Prices",
    COSTS = "Costs",
    RESULTS = "Results",
    EARLY_CASH_FLOW_COMPARISON = "Early cash-flow comparison",
}

export const FIELD_SECTIONS: Record<SetupField, SettingsSection> = {
    ensemble: SettingsSection.DATA_AND_VALUATION,
    predictionYear: SettingsSection.DATA_AND_VALUATION,
    oilPrice: SettingsSection.PRICES,
    gasPrice: SettingsSection.PRICES,
    injection: SettingsSection.PRICES,
    consumption: SettingsSection.PRICES,
    costs: SettingsSection.COSTS,
    earlyYear: SettingsSection.EARLY_CASH_FLOW_COMPARISON,
};

export type SectionStateProps = Required<Pick<SettingSectionProps, "title" | "open" | "onOpenChange">>;

export type SettingsSectionProps = {
    sectionProps: SectionStateProps;
    readiness: SetupReadiness;
};

/** Marks a field's content so the setup summary can focus it. */
export function setupFieldClassName(field: SetupField): string {
    return `setup-field-${field}`;
}
