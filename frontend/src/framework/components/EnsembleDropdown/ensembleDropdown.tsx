import { Ensemble } from "@framework/Ensemble";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { ColorTile } from "@lib/components/ColorTile";
import { Dropdown, DropdownOption, DropdownProps } from "@lib/components/Dropdown";

type EnsembleDropdownProps = {
    ensembleSet?: EnsembleSet;
    ensembles?: Ensemble[];
    value: EnsembleIdent | null;
    onChange: (ensembleIdent: EnsembleIdent | null) => void;
} & Omit<DropdownProps<string>, "options" | "value" | "onChange">;

export function EnsembleDropdown(props: EnsembleDropdownProps): JSX.Element {
    const { ensembleSet, value, onChange, ...rest } = props;
    const ensembleArr = props.ensembles ?? ensembleSet?.getEnsembleArr() ?? [];

    function handleSelectionChanged(selectedEnsembleIdentStr: string) {
        const foundEnsemble = ensembleArr.find(
            (ensemble) => ensemble.getIdent().toString() === selectedEnsembleIdentStr
        );
        onChange(foundEnsemble ? foundEnsemble.getIdent() : null);
    }

    const optionsArr: DropdownOption[] = [];
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
