import type { DashboardSettingDefinition } from "@framework/DashboardSettings/DashboardSettingDefinition";
import { TIME_DASHBOARD_SETTING } from "@framework/DashboardSettings/definitions/time";
import { isoStringToTimestampUtcMs } from "@framework/utils/timestampUtils";

/**
 * Connects a DPF setting type to a dashboard setting. While the dashboard setting is active on the
 * dashboard, every setting of this type contributes its value constraints to it, and uses the dashboard
 * value instead of its own (local) one - which is kept, and used again once the setting is no longer
 * dashboard.
 */
export type DpfDashboardSettingAdapter<TInternalValue, TValueConstraints, TDashboardValue, TDashboardConstraints> = {
    definition: DashboardSettingDefinition<TDashboardValue, TDashboardConstraints>;

    // Not called for static settings, which have no value constraints to contribute. Return `null` when
    // this setting has no opinion on the dashboard setting's options.
    mapValueConstraintsToDashboardConstraints: (valueConstraints: TValueConstraints) => TDashboardConstraints | null;

    // Maps the dashboard value onto this setting's internal value, which then goes through the setting's
    // own validation, external value mapping and representation - just like a locally chosen value.
    // `localValue` allows keeping the parts of the local value the dashboard setting doesn't cover.
    mapDashboardValueToInternalValue: (
        dashboardValue: TDashboardValue,
        valueConstraints: TValueConstraints,
        localValue: TInternalValue,
    ) => TInternalValue;

    // Whether the setting follows the dashboard value at all, given its own (local) value - e.g. only when
    // it has picked the same kind of value. While it doesn't, it keeps its local value and isn't shown as
    // controlled, but still contributes its constraints. Defaults to always following.
    followsDashboardValue?: (dashboardValue: TDashboardValue, localValue: TInternalValue) => boolean;

    // Keeps the setting's own component editable while it is controlled, instead of showing a read-only
    // representation. The component is told via `isControlledByDashboardSetting`, and must itself disable
    // what the dashboard setting controls - e.g. so a controlled setting can still switch to a kind of value
    // it doesn't follow.
    keepsComponentEditableWhileControlled?: boolean;
};

// For settings whose internal value and constraints already have the dashboard setting's shape.
export function makeIdentityDpfDashboardSettingAdapter<TValue, TConstraints>(
    definition: DashboardSettingDefinition<TValue, TConstraints>,
): DpfDashboardSettingAdapter<TValue, TConstraints, TValue, TConstraints> {
    return {
        definition,
        mapValueConstraintsToDashboardConstraints: (valueConstraints) => valueConstraints,
        mapDashboardValueToInternalValue: (dashboardValue) => dashboardValue,
    };
}

// Time options are ISO strings, possibly mixed with intervals or "NO_TIME" - only actual time points
// parse to a timestamp.
function isTimePoint(option: string): boolean {
    return !Number.isNaN(isoStringToTimestampUtcMs(option));
}

// For settings with ISO time string options (`TIME_POINT`, `TIME_OR_INTERVAL`): contributes the time
// points as timestamps, and maps the dashboard time back onto the option with the same timestamp. A
// setting without any time point options (e.g. a static grid property) has no opinion and keeps its own
// value.
export function makeTimePointDpfDashboardSettingAdapter(): DpfDashboardSettingAdapter<
    string | null,
    string[],
    number | null,
    readonly number[]
> {
    return {
        definition: TIME_DASHBOARD_SETTING,
        mapValueConstraintsToDashboardConstraints: (valueConstraints) => {
            const timePoints = valueConstraints.filter(isTimePoint);
            return timePoints.length > 0 ? timePoints.map(isoStringToTimestampUtcMs) : null;
        },
        mapDashboardValueToInternalValue: (dashboardValue, valueConstraints, localValue) => {
            const timePoints = valueConstraints.filter(isTimePoint);
            if (timePoints.length === 0) {
                return localValue;
            }
            if (dashboardValue === null) {
                return null;
            }

            return timePoints.find((option) => isoStringToTimestampUtcMs(option) === dashboardValue) ?? null;
        },
    };
}
