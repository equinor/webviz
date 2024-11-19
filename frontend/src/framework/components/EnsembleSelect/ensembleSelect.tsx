import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { Ensemble } from "@framework/Ensemble";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { EnsembleType } from "@framework/types/ensembleType";
import { ColorTile } from "@lib/components/ColorTile";
import { Select, SelectOption, SelectProps } from "@lib/components/Select";

// Overload for EnsembleSelect with DeltaEnsembleIdent
export type EnsembleSelectWithDeltaEnsemblesProps = {
    ensembleSet: EnsembleSet;
    multiple?: boolean;
    allowDeltaEnsembles: true;
    value: (EnsembleIdent | DeltaEnsembleIdent)[];
    onChange: (ensembleIdentArr: (EnsembleIdent | DeltaEnsembleIdent)[]) => void;
} & Omit<SelectProps<string>, "options" | "value" | "onChange">;

// Overload for EnsembleSelect without DeltaEnsembleIdent
export type EnsembleSelectWithoutDeltaEnsemblesProps = {
    ensembleSet: EnsembleSet;
    multiple?: boolean;
    allowDeltaEnsembles?: false | undefined;
    value: EnsembleIdent[];
    onChange: (ensembleIdentArr: EnsembleIdent[]) => void;
} & Omit<SelectProps<string>, "options" | "value" | "onChange">;

export function EnsembleSelect(props: EnsembleSelectWithDeltaEnsemblesProps): JSX.Element;
export function EnsembleSelect(props: EnsembleSelectWithoutDeltaEnsemblesProps): JSX.Element;
export function EnsembleSelect(
    props: EnsembleSelectWithDeltaEnsemblesProps | EnsembleSelectWithoutDeltaEnsemblesProps
): JSX.Element {
    const { ensembleSet, value, allowDeltaEnsembles, onChange, multiple, ...rest } = props;

    function handleSelectionChanged(selectedEnsembleIdentStrArr: string[]) {
        const identArr: (EnsembleIdent | DeltaEnsembleIdent)[] = [];
        for (const identStr of selectedEnsembleIdentStrArr) {
            const foundEnsemble = ensembleSet.findEnsembleByIdentString(identStr);
            if (foundEnsemble !== null && (allowDeltaEnsembles || foundEnsemble instanceof Ensemble)) {
                identArr.push(foundEnsemble.getIdent());
            }
        }

        // Filter to match the correct return type before calling onChange
        if (!allowDeltaEnsembles) {
            const validIdentArr = identArr.filter((ident) => ident instanceof EnsembleIdent) as EnsembleIdent[];
            onChange(validIdentArr);
            return;
        }
        onChange(identArr);
    }

    const optionsArr: SelectOption[] = [];
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

    const selectedArr: string[] = [];
    for (const ident of value) {
        selectedArr.push(ident.toString());
    }

    const isMultiple = multiple ?? true;

    return (
        <Select
            options={optionsArr}
            value={selectedArr}
            onChange={handleSelectionChanged}
            multiple={isMultiple}
            {...rest}
        />
    );
}
