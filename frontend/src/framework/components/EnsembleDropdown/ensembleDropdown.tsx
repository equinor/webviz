import React from "react";

import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { ColorTile } from "@lib/components/ColorTile";
import { Dropdown, DropdownOption, DropdownProps } from "@lib/components/Dropdown";

// Overload for EnsembleDropdown with DeltaEnsembleIdent
export type EnsembleDropdownWithDeltaEnsemblesProps = {
    ensembles: readonly (RegularEnsemble | DeltaEnsemble)[];
    allowDeltaEnsembles: true;
    value: RegularEnsembleIdent | DeltaEnsembleIdent | null;
    onChange: (ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent | null) => void;
} & Omit<DropdownProps<string>, "options" | "value" | "onChange">;

// Overload for EnsembleDropdown without DeltaEnsembleIdent
export type EnsembleDropdownWithoutDeltaEnsemblesProps = {
    ensembles: readonly RegularEnsemble[];
    allowDeltaEnsembles?: false | undefined;
    value: RegularEnsembleIdent | null;
    onChange: (ensembleIdent: RegularEnsembleIdent | null) => void;
} & Omit<DropdownProps<string>, "options" | "value" | "onChange">;

export function EnsembleDropdown(props: EnsembleDropdownWithDeltaEnsemblesProps): JSX.Element;
export function EnsembleDropdown(props: EnsembleDropdownWithoutDeltaEnsemblesProps): JSX.Element;
export function EnsembleDropdown(
    props: EnsembleDropdownWithDeltaEnsemblesProps | EnsembleDropdownWithoutDeltaEnsemblesProps
): JSX.Element {
    const { onChange, ensembles, allowDeltaEnsembles, value, ...rest } = props;

    const handleSelectionChange = React.useCallback(
        function handleSelectionChange(selectedEnsembleIdentStr: string) {
            const foundEnsemble = ensembles.find(
                (ensemble) => ensemble.getIdent().toString() === selectedEnsembleIdentStr
            );
            if (foundEnsemble && allowDeltaEnsembles) {
                onChange(foundEnsemble.getIdent());
                return;
            }
            if (!foundEnsemble || foundEnsemble instanceof DeltaEnsemble) {
                onChange(null);
                return;
            }
            onChange(foundEnsemble.getIdent());
        },
        [allowDeltaEnsembles, ensembles, onChange]
    );

    const optionsArray: DropdownOption[] = [];
    for (const ens of ensembles) {
        optionsArray.push({
            value: ens.getIdent().toString(),
            label: ens.getDisplayName(),
            adornment: (
                <span className="w-5">
                    <ColorTile color={ens.getColor()} />
                </span>
            ),
        });
    }

    return <Dropdown options={optionsArray} value={value?.toString()} onChange={handleSelectionChange} {...rest} />;
}
