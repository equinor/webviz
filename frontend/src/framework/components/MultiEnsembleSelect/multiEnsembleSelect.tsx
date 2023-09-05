import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { Select, SelectOption, SelectProps } from "@lib/components/Select";

type MultiEnsembleSelectProps = {
    ensembleSet: EnsembleSet;
    value: EnsembleIdent[];
    onChange: (ensembleIdentArr: EnsembleIdent[]) => void;
} & Omit<SelectProps, "options" | "value" | "onChange" | "multiple">;

export function MultiEnsembleSelect(props: MultiEnsembleSelectProps): JSX.Element {
    const { ensembleSet, value, onChange, ...rest } = props;

    function handleSelectionChanged(selectedEnsembleIdentStrArr: string[]) {
        const identArr: EnsembleIdent[] = [];
        for (const identStr of selectedEnsembleIdentStrArr) {
            const foundEnsemble = ensembleSet.findEnsembleByIdentString(identStr);
            if (foundEnsemble) {
                identArr.push(foundEnsemble.getIdent());
            }
        }

        onChange(identArr);
    }

    const optionsArr: SelectOption[] = [];
    for (const ens of ensembleSet.getEnsembleArr()) {
        optionsArr.push({ value: ens.getIdent().toString(), label: ens.getDisplayName() });
    }

    const selectedArr: string[] = [];
    for (const ident of value) {
        selectedArr.push(ident.toString());
    }

    return (
        <Select options={optionsArr} value={selectedArr} onChange={handleSelectionChanged} multiple={true} {...rest} />
    );
}
