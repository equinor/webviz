import React from "react";

import { Ensemble } from "@framework/Ensemble";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ColorTile } from "@lib/components/ColorTile";
import { Select, SelectOption, SelectProps } from "@lib/components/Select";

type EnsembleSelectProps = {
    ensembles: readonly Ensemble[];
    value: EnsembleIdent[];
    onChange: (ensembleIdentArr: EnsembleIdent[]) => void;
} & Omit<SelectProps<string>, "options" | "value" | "onChange">;

export function EnsembleSelect(props: EnsembleSelectProps): React.ReactNode {
    const { ensembles, value, onChange, multiple, ...rest } = props;

    const handleSelectionChange = React.useCallback(
        function handleSelectionChanged(selectedEnsembleIdentStrArr: string[]) {
            const identArr: EnsembleIdent[] = [];
            for (const identStr of selectedEnsembleIdentStrArr) {
                const foundEnsemble = ensembles.find((ens) => ens.getIdent().toString() === identStr);
                if (foundEnsemble) {
                    identArr.push(foundEnsemble.getIdent());
                }
            }

            onChange(identArr);
        },
        [ensembles, onChange]
    );

    const optionsArr: SelectOption[] = [];
    for (const ens of ensembles) {
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

    const selectedArr: string[] = [];
    for (const ident of value) {
        selectedArr.push(ident.toString());
    }

    const isMultiple = multiple ?? true;

    return (
        <Select
            options={optionsArr}
            value={selectedArr}
            onChange={handleSelectionChange}
            multiple={isMultiple}
            {...rest}
        />
    );
}
