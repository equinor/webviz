import { DashboardOptionListSelect } from "../components/DashboardOptionListSelect";
import type { DashboardSettingComponentProps, DashboardSettingOptions } from "../DashboardSettingDefinition";

export type OptionListDashboardSettingConfig<TValue extends string | number, TOption> = {
    key: string;
    label: string;
    getOptionValue: (option: TOption) => TValue;
    getOptionLabel: (option: TOption) => string;
    // Applied to the union of the sources' options, so they don't show up in contribution order.
    compareOptions?: (a: TOption, b: TOption) => number;
};

// Makes the options for a dashboard setting whose value is one of a list of options (identified by
// `getOptionValue`), rendered by `DashboardOptionListSelect` - the common case of realizations, grid
// models, wellbores, ... Only a helper for that one shape: register the result with
// `DashboardSettingRegistry.registerDashboardSetting`, spreading it to override any part if needed.
export function makeOptionListDashboardSettingOptions<TValue extends string | number, TOption>(
    config: OptionListDashboardSettingConfig<TValue, TOption>,
): DashboardSettingOptions<TValue | null, readonly TOption[]> {
    const { getOptionValue, getOptionLabel, compareOptions } = config;

    function hasOption(constraints: readonly TOption[], value: TValue): boolean {
        return constraints.some((option) => getOptionValue(option) === value);
    }

    // Binds the option accessors - the panel only passes the common component props.
    function OptionListComponent(props: DashboardSettingComponentProps<TValue | null, readonly TOption[]>) {
        return <DashboardOptionListSelect {...props} getOptionValue={getOptionValue} getOptionLabel={getOptionLabel} />;
    }

    return {
        key: config.key,
        label: config.label,
        defaultValue: null,
        initialConstraints: [],
        // Options are compared by their value, so equal-but-distinct option objects from different
        // sources (e.g. two layers' wellbore headers) are deduplicated.
        unionConstraints: (a, b) => {
            const union = [...a, ...b.filter((option) => !hasOption(a, getOptionValue(option)))];
            return compareOptions ? union.sort(compareOptions) : union;
        },
        intersectConstraints: (a, b) => a.filter((option) => hasOption(b, getOptionValue(option))),
        isValueValid: (value, constraints) =>
            value === null ? constraints.length === 0 : hasOption(constraints, value),
        fixupValue: (_value, constraints) => (constraints.length > 0 ? getOptionValue(constraints[0]) : null),
        Component: OptionListComponent,
    };
}
