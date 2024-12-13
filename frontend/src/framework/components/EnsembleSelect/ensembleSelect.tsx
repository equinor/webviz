import React from "react";

import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import { ColorTile } from "@lib/components/ColorTile";
import { Select, SelectOption, SelectProps } from "@lib/components/Select";

// Overload for EnsembleSelect with DeltaEnsembleIdent
export type EnsembleSelectWithDeltaEnsemblesProps = {
    ensembles: readonly (RegularEnsemble | DeltaEnsemble)[];
    multiple?: boolean;
    allowDeltaEnsembles: true;
    value: (RegularEnsembleIdent | DeltaEnsembleIdent)[];
    onChange: (ensembleIdentArray: (RegularEnsembleIdent | DeltaEnsembleIdent)[]) => void;
} & Omit<SelectProps<string>, "options" | "value" | "onChange">;

// Overload for EnsembleSelect without DeltaEnsembleIdent
export type EnsembleSelectWithoutDeltaEnsemblesProps = {
    ensembles: readonly RegularEnsemble[];
    multiple?: boolean;
    allowDeltaEnsembles?: false | undefined;
    value: RegularEnsembleIdent[];
    onChange: (ensembleIdentArray: RegularEnsembleIdent[]) => void;
} & Omit<SelectProps<string>, "options" | "value" | "onChange">;

export function EnsembleSelect(props: EnsembleSelectWithDeltaEnsemblesProps): JSX.Element;
export function EnsembleSelect(props: EnsembleSelectWithoutDeltaEnsemblesProps): JSX.Element;
export function EnsembleSelect(
    props: EnsembleSelectWithDeltaEnsemblesProps | EnsembleSelectWithoutDeltaEnsemblesProps
): JSX.Element {
    const { onChange, ensembles, value, allowDeltaEnsembles, multiple, ...rest } = props;

    const handleSelectionChange = React.useCallback(
        function handleSelectionChanged(selectedEnsembleIdentStringArray: string[]) {
            const identArray: (RegularEnsembleIdent | DeltaEnsembleIdent)[] = [];
            for (const identStr of selectedEnsembleIdentStringArray) {
                const foundEnsemble = ensembles.find((ens) => ens.getIdent().toString() === identStr);
                if (foundEnsemble && (allowDeltaEnsembles || foundEnsemble instanceof RegularEnsemble)) {
                    identArray.push(foundEnsemble.getIdent());
                }
            }

            // Filter to match the correct return type before calling onChange
            if (!allowDeltaEnsembles) {
                const validIdentArray = identArray.filter((ident) =>
                    isEnsembleIdentOfType(ident, RegularEnsembleIdent)
                ) as RegularEnsembleIdent[];
                onChange(validIdentArray);
                return;
            }
            onChange(identArray);
        },
        [allowDeltaEnsembles, ensembles, onChange]
    );

    const optionsArray: SelectOption[] = [];
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

    const selectedArray: string[] = [];
    for (const ident of value) {
        selectedArray.push(ident.toString());
    }

    const isMultiple = multiple ?? true;

    return (
        <Select
            options={optionsArray}
            value={selectedArray}
            onChange={handleSelectionChange}
            multiple={isMultiple}
            {...rest}
        />
    );
}
