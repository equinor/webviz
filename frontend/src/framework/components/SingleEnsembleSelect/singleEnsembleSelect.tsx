import { Dropdown, DropdownOption } from "@lib/components/Dropdown";

import { EnsembleIdent } from "../../EnsembleIdent";
import { EnsembleSet } from "../../EnsembleSet";

type SingleEnsembleSelectProps = {
    ensembleSet: EnsembleSet;
    value: EnsembleIdent | null;
    onChange: (ensembleIdent: EnsembleIdent | null) => void;
};

export function SingleEnsembleSelect(props: SingleEnsembleSelectProps): JSX.Element {
    function handleSelectionChanged(selectedEnsembleIdentStr: string) {
        const foundEnsemble = props.ensembleSet.findEnsembleByIdentString(selectedEnsembleIdentStr);
        props.onChange(foundEnsemble ? foundEnsemble.getIdent() : null);
    }

    const optionsArr: DropdownOption[] = [];
    for (const ens of props.ensembleSet.getEnsembleArr()) {
        optionsArr.push({ value: ens.getIdent().toString(), label: ens.getDisplayName() });
    }

    return <Dropdown options={optionsArr} value={props.value?.toString()} onChange={handleSelectionChanged} />;
}
