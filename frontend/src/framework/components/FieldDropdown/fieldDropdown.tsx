import type { EnsembleSet } from "@framework/EnsembleSet";
import type { DropdownOption, DropdownProps } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";

export type FieldDropdownProps = {
    ensembleSet: EnsembleSet;
    value: string | null;
    fallbackFieldList?: string[];
    onChange: (fieldIdentifier: string | null) => void;
} & Omit<DropdownProps, "options" | "value" | "onChange">;

export function FieldDropdown(props: FieldDropdownProps): JSX.Element {
    const { ensembleSet, value, fallbackFieldList, onChange, ...rest } = props;

    function handleSelectionChanged(fieldIdentifier: string) {
        onChange(fieldIdentifier);
    }

    const fieldIdents = new Set<string>();

    if (ensembleSet.getRegularEnsembleArray().length) {
        for (const ens of ensembleSet.getRegularEnsembleArray()) {
            fieldIdents.add(ens.getFieldIdentifier());
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

    return <Dropdown options={optionsArray} value={value?.toString()} onChange={handleSelectionChanged} {...rest} />;
}
