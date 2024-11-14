import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet, EnsembleType } from "@framework/EnsembleSet";
import { ColorTile } from "@lib/components/ColorTile";
import { Dropdown, DropdownOption, DropdownProps } from "@lib/components/Dropdown";

// Overload for EnsembleDropdown with DeltaEnsembleIdent
export type EnsembleDropdownWithDeltaEnsemblesProps = {
    ensembleSet: EnsembleSet;
    allowDeltaEnsembles: true;
    value: EnsembleIdent | DeltaEnsembleIdent | null;
    onChange: (ensembleIdent: EnsembleIdent | DeltaEnsembleIdent | null) => void;
} & Omit<DropdownProps<string>, "options" | "value" | "onChange">;

// Overload for EnsembleDropdown without DeltaEnsembleIdent
export type EnsembleDropdownWithoutDeltaEnsemblesProps = {
    ensembleSet: EnsembleSet;
    allowDeltaEnsembles?: false | undefined;
    value: EnsembleIdent | null;
    onChange: (ensembleIdent: EnsembleIdent | null) => void;
} & Omit<DropdownProps<string>, "options" | "value" | "onChange">;

export function EnsembleDropdown(props: EnsembleDropdownWithDeltaEnsemblesProps): JSX.Element;
export function EnsembleDropdown(props: EnsembleDropdownWithoutDeltaEnsemblesProps): JSX.Element;
export function EnsembleDropdown(
    props: EnsembleDropdownWithDeltaEnsemblesProps | EnsembleDropdownWithoutDeltaEnsemblesProps
): JSX.Element {
    const { ensembleSet, allowDeltaEnsembles, value, onChange, ...rest } = props;

    function handleSelectionChanged(selectedEnsembleIdentStr: string) {
        const foundEnsemble = ensembleSet.findEnsembleByIdentString(selectedEnsembleIdentStr);
        if (foundEnsemble === null) {
            onChange(null);
            return;
        }
        if (allowDeltaEnsembles) {
            onChange(foundEnsemble.getIdent());
            return;
        }
        if (foundEnsemble instanceof DeltaEnsemble) {
            onChange(null);
            return;
        }
        onChange(foundEnsemble.getIdent());
    }

    const optionsArr: DropdownOption[] = [];
    const ensembleArr = allowDeltaEnsembles
        ? ensembleSet.getEnsembleArr(EnsembleType.ALL)
        : ensembleSet.getEnsembleArr(EnsembleType.REGULAR);
    for (const ens of ensembleArr) {
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

    return <Dropdown options={optionsArr} value={value?.toString()} onChange={handleSelectionChanged} {...rest} />;
}
