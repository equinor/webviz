import { SurfaceStatisticFunction_api } from "@api";
import { ComboboxCompositions } from "@lib/components/Combobox/compositions";
import type { ComboboxItem } from "@lib/components/Combobox/types";
import { SettingWrapper } from "@lib/components/SettingWrapper";

//
// Sub-component for aggregation/statistic selection
type AggregationDropdownProps = {
    selectedAggregation: SurfaceStatisticFunction_api | null;
    onAggregationSelectionChange: (aggregation: SurfaceStatisticFunction_api | null) => void;
};

export function AggregationDropdown(props: AggregationDropdownProps): JSX.Element {
    const itemArr: ComboboxItem<string>[] = [
        { value: "SINGLE_REAL", label: "Single realization" },
        { value: SurfaceStatisticFunction_api.MEAN, label: "Mean" },
        { value: SurfaceStatisticFunction_api.STD, label: "Std" },
        { value: SurfaceStatisticFunction_api.MIN, label: "Min" },
        { value: SurfaceStatisticFunction_api.MAX, label: "Max" },
        { value: SurfaceStatisticFunction_api.P10, label: "P10" },
        { value: SurfaceStatisticFunction_api.P90, label: "P90" },
        { value: SurfaceStatisticFunction_api.P50, label: "P50" },
    ];

    return (
        <SettingWrapper label="Aggregation/statistic">
            <ComboboxCompositions.WithBrowseButtons
                items={itemArr}
                value={props.selectedAggregation ?? "SINGLE_REAL"}
                onValueChange={(newVal: string) =>
                    props.onAggregationSelectionChange(
                        newVal != "SINGLE_REAL" ? (newVal as SurfaceStatisticFunction_api) : null,
                    )
                }
            />
        </SettingWrapper>
    );
}
