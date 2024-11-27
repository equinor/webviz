import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { Ensemble } from "@framework/Ensemble";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { ColorTile } from "@lib/components/ColorTile";
import { Select, SelectOption, SelectProps } from "@lib/components/Select";

// Overload for EnsembleSelect with DeltaEnsembleIdent
export type EnsembleSelectWithDeltaEnsemblesProps = {
    ensembleSet: EnsembleSet;
    multiple?: boolean;
    allowDeltaEnsembles: true;
    value: (EnsembleIdent | DeltaEnsembleIdent)[];
    onChange: (ensembleIdentArray: (EnsembleIdent | DeltaEnsembleIdent)[]) => void;
} & Omit<SelectProps<string>, "options" | "value" | "onChange">;

// Overload for EnsembleSelect without DeltaEnsembleIdent
export type EnsembleSelectWithoutDeltaEnsemblesProps = {
    ensembleSet: EnsembleSet;
    multiple?: boolean;
    allowDeltaEnsembles?: false | undefined;
    value: EnsembleIdent[];
    onChange: (ensembleIdentArray: EnsembleIdent[]) => void;
} & Omit<SelectProps<string>, "options" | "value" | "onChange">;

export function EnsembleSelect(props: EnsembleSelectWithDeltaEnsemblesProps): JSX.Element;
export function EnsembleSelect(props: EnsembleSelectWithoutDeltaEnsemblesProps): JSX.Element;
export function EnsembleSelect(
    props: EnsembleSelectWithDeltaEnsemblesProps | EnsembleSelectWithoutDeltaEnsemblesProps
): JSX.Element {
    const { ensembleSet, value, allowDeltaEnsembles, onChange, multiple, ...rest } = props;

    function handleSelectionChanged(selectedEnsembleIdentStrArray: string[]) {
        const identArray: (EnsembleIdent | DeltaEnsembleIdent)[] = [];
        for (const identStr of selectedEnsembleIdentStrArray) {
            const foundEnsemble = ensembleSet.findEnsembleByIdentString(identStr);
            if (foundEnsemble !== null && (allowDeltaEnsembles || foundEnsemble instanceof Ensemble)) {
                identArray.push(foundEnsemble.getIdent());
            }
        }

        // Filter to match the correct return type before calling onChange
        if (!allowDeltaEnsembles) {
            const validIdentArray = identArray.filter((ident) => ident instanceof EnsembleIdent) as EnsembleIdent[];
            onChange(validIdentArray);
            return;
        }
        onChange(identArray);
    }

    const optionsArray: SelectOption[] = [];
    const ensembleArray = allowDeltaEnsembles ? ensembleSet.getAllEnsembleTypesArray() : ensembleSet.getEnsembleArray();
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
