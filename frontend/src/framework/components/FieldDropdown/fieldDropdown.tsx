import type { EnsembleSet } from "@framework/EnsembleSet";
import type { DropdownOption } from "@lib/components/Dropdown";
import { Combobox, type ComboboxProps } from "@lib/newComponents/Combobox";

export type FieldDropdownProps = {
    ensembleSet: EnsembleSet;
    value: string | null;
    fallbackFieldList?: string[];
    onChange: (fieldIdentifier: string | null) => void;
} & Omit<ComboboxProps<string>, "items" | "value" | "onValueChange">;

export function FieldDropdown(props: FieldDropdownProps): JSX.Element {
    const { ensembleSet, value, fallbackFieldList, onChange, ...rest } = props;

    function handleSelectionChanged(fieldIdentifier: string | null) {
        onChange(fieldIdentifier);
    }
    const fieldIdents = new Set<string>();

    if (ensembleSet.getRegularEnsembleArray().length) {
        for (const ens of ensembleSet.getRegularEnsembleArray()) {
            for (const fieldIdentifier of ens.getFieldIdentifiers()) {
                fieldIdents.add(fieldIdentifier);
            }
        }
    } else if (fallbackFieldList) {
        for (const field of fallbackFieldList) {
            fieldIdents.add(field);
        }
    }

    const optionsArray: DropdownOption[] = [...fieldIdents].map((id) => ({
        value: id,
        label: id,
    }));

    return <Combobox items={optionsArray} value={value?.toString()} onValueChange={handleSelectionChanged} {...rest} />;
}
