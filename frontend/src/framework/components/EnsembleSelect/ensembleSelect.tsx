import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import { ColorTile } from "@lib/components/ColorTile";
import { Select, SelectOption, SelectProps } from "@lib/components/Select";

// Overload for EnsembleSelect with DeltaEnsembleIdent
export type EnsembleSelectWithDeltaEnsemblesProps = {
    ensembleSet: EnsembleSet;
    multiple?: boolean;
    allowDeltaEnsembles: true;
    value: (RegularEnsembleIdent | DeltaEnsembleIdent)[];
    onChange: (ensembleIdentArray: (RegularEnsembleIdent | DeltaEnsembleIdent)[]) => void;
} & Omit<SelectProps<string>, "options" | "value" | "onChange">;

// Overload for EnsembleSelect without DeltaEnsembleIdent
export type EnsembleSelectWithoutDeltaEnsemblesProps = {
    ensembleSet: EnsembleSet;
    multiple?: boolean;
    allowDeltaEnsembles?: false | undefined;
    value: RegularEnsembleIdent[];
    onChange: (ensembleIdentArray: RegularEnsembleIdent[]) => void;
} & Omit<SelectProps<string>, "options" | "value" | "onChange">;

export function EnsembleSelect(props: EnsembleSelectWithDeltaEnsemblesProps): JSX.Element;
export function EnsembleSelect(props: EnsembleSelectWithoutDeltaEnsemblesProps): JSX.Element;
export function EnsembleSelect(
    props: EnsembleSelectWithDeltaEnsemblesProps | EnsembleSelectWithoutDeltaEnsemblesProps
): JSX.Element {
    const { ensembleSet, value, allowDeltaEnsembles, onChange, multiple, ...rest } = props;

    function handleSelectionChanged(selectedEnsembleIdentStrArray: string[]) {
        const identArray: (RegularEnsembleIdent | DeltaEnsembleIdent)[] = [];
        for (const identStr of selectedEnsembleIdentStrArray) {
            const foundEnsemble = ensembleSet.findEnsembleByIdentString(identStr);
            if (foundEnsemble && (allowDeltaEnsembles || foundEnsemble instanceof RegularEnsemble)) {
                identArray.push(foundEnsemble.getIdent());
            }

        // Filter to match the correct return type before calling onChange
        if (!allowDeltaEnsembles) {
            const validIdentArray = identArray.filter((ident) => isEnsembleIdentOfType(ident, RegularEnsembleIdent));
            onChange(validIdentArray);
            return;
        }
        onChange(identArray);
    }

    const optionsArray: SelectOption[] = [];
    const ensembleArray = allowDeltaEnsembles ? ensembleSet.getEnsembleArray() : ensembleSet.getRegularEnsembleArray();
    for (const ens of ensembleArray) {
        optionsArray.push({
            value: ens.getIdent().toString(),
            label: ens.getDisplayName(),
            adornment: (
                <span className="w-5">
                    <ColorTile color={ens.getColor()} />
                </span>
            ),
        });
    }

    const selectedArray: string[] = [];
    for (const ident of value) {
        selectedArray.push(ident.toString());
    }

    const isMultiple = multiple ?? true;

    return (
        <Select
            options={optionsArray}
            value={selectedArray}
            onChange={handleSelectionChanged}
            multiple={isMultiple}
            {...rest}
        />
    );
}
