import { ComboboxCompositions } from "@lib/components/Combobox/compositions";
import type { ComboboxItem } from "@lib/components/Combobox/types";

import type { DashboardSettingComponentProps } from "../DashboardSettingDefinition";

export type DashboardOptionListSelectProps<TValue extends string | number, TOption> = DashboardSettingComponentProps<
    TValue | null,
    readonly TOption[]
> & {
    getOptionValue: (option: TOption) => TValue;
    getOptionLabel: (option: TOption) => string;
};

/**
 * The options as a combobox with prev/next buttons - for dashboard settings whose value is one of a list of
 * options (see `makeOptionListDashboardSettingOptions`).
 */
export function DashboardOptionListSelect<TValue extends string | number, TOption>(
    props: DashboardOptionListSelectProps<TValue, TOption>,
) {
    const { getOptionValue, getOptionLabel } = props;

    const items: ComboboxItem<TValue>[] = props.constraints.map((option) => ({
        value: getOptionValue(option),
        label: getOptionLabel(option),
    }));

    // Keep an invalid value visible instead of rendering an empty selection.
    if (props.value !== null && !props.constraints.some((option) => getOptionValue(option) === props.value)) {
        items.unshift({ value: props.value, label: `${props.value} (not available)`, disabled: true });
    }

    // Prev/next buttons skip disabled items - such as an unavailable value kept visible above.
    return (
        <ComboboxCompositions.WithBrowseButtons
            items={items}
            value={props.value}
            onValueChange={(value) => props.onValueChange(value)}
            placeholder="No value"
        />
    );
}
