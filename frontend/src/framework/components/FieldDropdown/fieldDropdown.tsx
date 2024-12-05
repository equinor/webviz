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

    const optionsArray: DropdownOption[] = [];
    for (const ens of ensembleSet.getRegularEnsembleArray()) {
        const fieldIdentifier = ens.getFieldIdentifier();
        if (optionsArray.some((option) => option.value === fieldIdentifier.toString())) {
            continue;
        }
        optionsArray.push({
            value: fieldIdentifier.toString(),
            label: fieldIdentifier.toString(),
        });
    }

    return <Dropdown options={optionsArray} value={value?.toString()} onChange={handleSelectionChanged} {...rest} />;
}
