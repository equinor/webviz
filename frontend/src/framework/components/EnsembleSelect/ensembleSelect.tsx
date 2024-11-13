import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { Ensemble } from "@framework/Ensemble";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { ColorTile } from "@lib/components/ColorTile";
import { Select, SelectOption, SelectProps } from "@lib/components/Select";

type EnsembleSelectProps = {
    ensembleSet: EnsembleSet;
    value: EnsembleIdent[];
    allowDeltaEnsembles?: boolean;
    onChange: (ensembleIdentArr: EnsembleIdent[]) => void;
} & Omit<SelectProps<string>, "options" | "value" | "onChange">;

export function EnsembleSelect(props: EnsembleSelectProps): JSX.Element {
    const { ensembleSet, value, allowDeltaEnsembles, onChange, multiple, ...rest } = props;

    function handleSelectionChanged(selectedEnsembleIdentStrArr: string[]) {
        const identArr: EnsembleIdent[] = [];
        for (const identStr of selectedEnsembleIdentStrArr) {
            const foundEnsemble = ensembleSet.findEnsembleByIdentString(identStr);
            if (foundEnsemble) {
                identArr.push(foundEnsemble.getIdent());
            }
        }

        onChange(identArr);
    }

    const optionsArr: SelectOption[] = [];
    optionsArr.push(...createEnsembleSelectOptions(ensembleSet.getEnsembleArr()));
    if (allowDeltaEnsembles) {
        optionsArr.push(...createEnsembleSelectOptions(ensembleSet.getDeltaEnsembleArr()));
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

function createEnsembleSelectOptions(ensembleArr: readonly Ensemble[] | readonly DeltaEnsemble[]): SelectOption[] {
    const optionsArr: SelectOption[] = [];
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
    return optionsArr;
}
