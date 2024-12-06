import React from "react";

import { Ensemble } from "@framework/Ensemble";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ColorTile } from "@lib/components/ColorTile";
import { Dropdown, DropdownOption, DropdownProps } from "@lib/components/Dropdown";

type EnsembleDropdownProps = {
    ensembles: readonly Ensemble[];
    value: EnsembleIdent | null;
    onChange: (ensembleIdent: EnsembleIdent | null) => void;
} & Omit<DropdownProps<string>, "options" | "value" | "onChange">;

export function EnsembleDropdown(props: EnsembleDropdownProps): JSX.Element {
    const { onChange, value, ...rest } = props;

    const handleSelectionChange = React.useCallback(
        function handleSelectionChange(selectedEnsembleIdentStr: string) {
            const foundEnsemble = props.ensembles.find(
                (ensemble) => ensemble.getIdent().toString() === selectedEnsembleIdentStr
            );
            onChange(foundEnsemble ? foundEnsemble.getIdent() : null);
        },
        [props.ensembles, onChange]
    );

    const optionsArr: DropdownOption[] = [];
    for (const ens of props.ensembles) {
        optionsArr.push({
            value: ens.getIdent().toString(),
            label: ens.getDisplayName(),
            adornment: (
                <span className="w-5">
                    <ColorTile color={ens.getColor()} />
                </span>
            ),
        });
    }

    return <Dropdown options={optionsArr} value={value?.toString()} onChange={handleSelectionChange} {...rest} />;
}
