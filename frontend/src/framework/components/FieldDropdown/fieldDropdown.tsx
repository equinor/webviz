import { EnsembleSet } from "@framework/EnsembleSet";
import { Dropdown, DropdownOption, DropdownProps } from "@lib/components/Dropdown";

type FieldDropdownProps = {
    ensembleSet: EnsembleSet;
    value: string | null;
    onChange: (fieldIdentifier: string | null) => void;
} & Omit<DropdownProps, "options" | "value" | "onChange">;

export function FieldDropdown(props: FieldDropdownProps): JSX.Element {
    const { ensembleSet, value, onChange, ...rest } = props;

    function handleSelectionChanged(fieldIdentifier: string) {
        onChange(fieldIdentifier);
    }

    const optionsArr: DropdownOption[] = [];
    for (const ens of ensembleSet.getEnsembleArr()) {
        const fieldIdentifier = ens.getFieldIdentifier();
        if (optionsArr.some((option) => option.value === fieldIdentifier.toString())) {
            continue;
        }
        optionsArr.push({
            value: fieldIdentifier.toString(),
            label: fieldIdentifier.toString(),
        });
    }

    return <Dropdown options={optionsArr} value={value?.toString()} onChange={handleSelectionChanged} {...rest} />;
}
