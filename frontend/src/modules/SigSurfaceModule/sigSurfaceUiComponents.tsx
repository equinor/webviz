import { Ensemble } from "@api";
import { SurfaceStatisticFunction } from "@api";
import { Dropdown } from "@lib/components/Dropdown";
import { ListBoxDeprecated, ListBoxItem } from "@lib/components/ListBox/list-box";
import { UseQueryResult } from "@tanstack/react-query";

//
// Sub-component for ensemble selection
type EnsemblesDropdownProps = {
    ensemblesQuery: UseQueryResult<Ensemble[]>;
    selectedEnsemble: string | null;
    onEnsembleSelectionChange: (ensembleName: string) => void;
};

export function EnsemblesDropdown(props: EnsemblesDropdownProps): JSX.Element {
    const itemArr: ListBoxItem[] = [];
    let selectedEnsemble = props.selectedEnsemble;

    if (props.ensemblesQuery.isSuccess && props.ensemblesQuery.data.length > 0) {
        for (const ens of props.ensemblesQuery.data) {
            itemArr.push({ value: ens.name, label: ens.name });
        }
    } else {
        let placeholderStr = "<no ensembles>";
        if (props.ensemblesQuery.isError || props.ensemblesQuery.isLoading) {
            placeholderStr = `${props.ensemblesQuery.status.toString()}...`;
        }

        itemArr.push({ value: "", label: placeholderStr, disabled: true });
        selectedEnsemble = "";
    }

    console.log("render EnsemblesDropdown - selectedEnsemble=" + selectedEnsemble);

    return (
        <label>
            Ensemble:
            <ListBoxDeprecated
                items={itemArr}
                selectedItem={selectedEnsemble ?? ""}
                onSelect={props.onEnsembleSelectionChange}
            />
        </label>
    );
}

//
// Sub-component for aggregation/statistic selection
type AggregationDropdownProps = {
    selectedAggregation: SurfaceStatisticFunction | null;
    onAggregationSelectionChange: (aggregation: SurfaceStatisticFunction | null) => void;
};

export function AggregationDropdown(props: AggregationDropdownProps): JSX.Element {
    // Maybe export this from Dropdown instead=
    type DropdownItem = { value: string; label: string };

    const itemArr: DropdownItem[] = [
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
        <label>
            Aggregation/statistic:
            <Dropdown
                options={itemArr}
                value={props.selectedAggregation ?? "SINGLE_REAL"}
                onChange={(newVal: string) =>
                    props.onAggregationSelectionChange(
                        newVal != "SINGLE_REAL" ? (newVal as SurfaceStatisticFunction) : null
                    )
                }
            />
        </label>
    );
}
