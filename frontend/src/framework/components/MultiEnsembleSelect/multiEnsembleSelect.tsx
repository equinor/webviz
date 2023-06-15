import { Select, SelectOption } from "@lib/components/Select";

import { EnsembleIdent } from "../../EnsembleIdent";
import { EnsembleSet } from "../../EnsembleSet";

type MultiEnsembleSelectProps = {
    ensembleSet: EnsembleSet;
    value: EnsembleIdent[];
    onChange: (ensembleIdentArr: EnsembleIdent[]) => void;
    size?: number;
};

export function MultiEnsembleSelect(props: MultiEnsembleSelectProps): JSX.Element {
    function handleSelectionChanged(selectedEnsembleIdentStrArr: string[]) {
        const identArr: EnsembleIdent[] = [];
        for (const identStr of selectedEnsembleIdentStrArr) {
            const foundEnsemble = props.ensembleSet.findEnsembleByIdentString(identStr);
            if (foundEnsemble) {
                identArr.push(foundEnsemble.getIdent());
            }
        }

        props.onChange(identArr);
    }

    const optionsArr: SelectOption[] = [];
    for (const ens of props.ensembleSet.getEnsembleArr()) {
        optionsArr.push({ value: ens.getIdent().toString(), label: ens.getDisplayName() });
    }

    const selectedArr: string[] = [];
    for (const ident of props.value) {
        selectedArr.push(ident.toString());
    }

    return <Select options={optionsArr} value={selectedArr} onChange={handleSelectionChanged} size={props.size} />;
}
