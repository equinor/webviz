import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { Dropdown, DropdownOption, DropdownProps } from "@lib/components/Dropdown";

type EnsembleDropdownProps = {
    ensembleSet: EnsembleSet;
    value: EnsembleIdent | null;
    onChange: (ensembleIdent: EnsembleIdent | null) => void;
} & Omit<DropdownProps, "options" | "value" | "onChange">;

export function EnsembleDropdown(props: EnsembleDropdownProps): JSX.Element {
    const { ensembleSet, value, onChange, ...rest } = props;

    function handleSelectionChanged(selectedEnsembleIdentStr: string) {
        const foundEnsemble = ensembleSet.findEnsembleByIdentString(selectedEnsembleIdentStr);
        onChange(foundEnsemble ? foundEnsemble.getIdent() : null);
    }

    const optionsArr: DropdownOption[] = [];
    for (const ens of ensembleSet.getEnsembleArr()) {
        optionsArr.push({ value: ens.getIdent().toString(), label: ens.getDisplayName() });
    }

    return <Dropdown options={optionsArr} value={value?.toString()} onChange={handleSelectionChanged} {...rest} />;
}
