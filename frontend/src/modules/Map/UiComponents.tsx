import { SurfaceStatisticFunction } from "@api";
import { Dropdown, DropdownOption} from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";

//
// Sub-component for aggregation/statistic selection
type AggregationDropdownProps = {
    selectedAggregation: SurfaceStatisticFunction | null;
    onAggregationSelectionChange: (aggregation: SurfaceStatisticFunction | null) => void;
};

export function AggregationDropdown(props: AggregationDropdownProps): JSX.Element {
    const itemArr: DropdownOption[] = [
        { value: "SINGLE_REAL", label: "Single realization" },
        { value: SurfaceStatisticFunction.MEAN, label: "Mean" },
        { value: SurfaceStatisticFunction.STD, label: "Std" },
        { value: SurfaceStatisticFunction.MIN, label: "Min" },
        { value: SurfaceStatisticFunction.MAX, label: "Max" },
        { value: SurfaceStatisticFunction.P10, label: "P10" },
        { value: SurfaceStatisticFunction.P90, label: "P90" },
        { value: SurfaceStatisticFunction.P50, label: "P50" },
    ];

    return (
        <Label text="Aggregation/statistic:">
            <Dropdown
                options={itemArr}
                value={props.selectedAggregation ?? "SINGLE_REAL"}
                onChange={(newVal: string) =>
                    props.onAggregationSelectionChange(
                        newVal != "SINGLE_REAL" ? (newVal as SurfaceStatisticFunction) : null
                    )
                }
            />
        </Label>
    );
}
