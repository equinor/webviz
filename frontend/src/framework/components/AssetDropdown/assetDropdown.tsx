import type { EnsembleSet } from "@framework/EnsembleSet";
import type { DropdownOption, DropdownProps } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";

type AssetDropdownProps = {
    ensembleSet: EnsembleSet;
    value: string | null;
    onChange: (assetName: string | null) => void;
} & Omit<DropdownProps, "options" | "value" | "onChange">;

export function AssetDropdown(props: AssetDropdownProps): JSX.Element {
    const { ensembleSet, value, onChange, ...rest } = props;

    function handleSelectionChanged(assetName: string) {
        onChange(assetName);
    }

    const optionsArray: DropdownOption[] = [];
    for (const ens of ensembleSet.getRegularEnsembleArray()) {
        const assetName = ens.getAssetName();
        if (optionsArray.some((option) => option.value === assetName.toString())) {
            continue;
        }
        optionsArray.push({
            value: assetName.toString(),
            label: assetName.toString(),
        });
    }

    return <Dropdown options={optionsArray} value={value?.toString()} onChange={handleSelectionChanged} {...rest} />;
}
