import React from "react";

import { Select, SelectOption, SelectProps } from "@lib/components/Select";
import { WellPicksLayerData } from "@modules/Intersection/utils/layers/WellpicksLayer";

import _ from "lodash";

export type WellpickSelectProps = {
    availableWellpicks: WellPicksLayerData;
    selectedUnitPicks: string[];
    selectedNonUnitPicks: string[];
    onNonUnitPicksChange?: (value: string[]) => void;
    onUnitPicksChange?: (value: string[]) => void;
} & Omit<SelectProps, "options" | "value" | "onChange">;

export function WellpickSelect(props: WellpickSelectProps): React.ReactNode {
    const { onNonUnitPicksChange, onUnitPicksChange } = props;
    const groupedOptions = createWellpickOptions(props.availableWellpicks);

    const handleChangeUnitPicks = React.useCallback(
        function handleChangeUnitPicks(value: string[]) {
            if (!onUnitPicksChange) return;

            return _.isEqual(value, props.selectedUnitPicks) ? onUnitPicksChange([]) : onUnitPicksChange(value);
        },
        [onUnitPicksChange, props.selectedUnitPicks]
    );

    const handleChangeNonUnitPicks = React.useCallback(
        function handleChangeNonUnitPicks(value: string[]) {
            if (!onNonUnitPicksChange) return;

            return _.isEqual(value, props.selectedNonUnitPicks)
                ? onNonUnitPicksChange([])
                : onNonUnitPicksChange(value);
        },
        [onNonUnitPicksChange, props.selectedNonUnitPicks]
    );

    return (
        <div className="text-sm grid gap-x-3 gap-y-4 grid-cols-[auto_1fr]">
            <span className="mt-1">Unit picks</span>

            <Select
                value={props.selectedUnitPicks}
                options={groupedOptions.unitPicks}
                size={5}
                multiple
                onChange={handleChangeUnitPicks}
            />

            <span className="mt-1">Non-unit picks</span>

            <Select
                value={props.selectedNonUnitPicks}
                options={groupedOptions.nonUnitPicks}
                size={5}
                multiple
                onChange={handleChangeNonUnitPicks}
            />
        </div>
    );
}

type UnitPicks = WellPicksLayerData["unitPicks"];
type NonUnitPicks = WellPicksLayerData["nonUnitPicks"];

type WellpickOptions = {
    unitPicks: SelectOption[];
    nonUnitPicks: SelectOption[];
};

function createWellpickOptions(groupedWellpicks: WellPicksLayerData): WellpickOptions {
    return {
        unitPicks: unitPickToSelectOptions(groupedWellpicks.unitPicks),
        nonUnitPicks: nonUnitPickToSelectOptions(groupedWellpicks.nonUnitPicks),
    };
}

function nonUnitPickToSelectOptions(picks: NonUnitPicks): SelectOption[] {
    return picks.map((pick) => ({
        label: pick.identifier,
        value: pick.identifier,
    }));
}

function unitPickToSelectOptions(picks: UnitPicks): SelectOption[] {
    return picks.map((pick) => ({
        label: pick.name,
        value: pick.name,
    }));
}
