import type React from "react";

import { FolderOpen, History, Remove } from "@mui/icons-material";

import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { ColorSelect } from "@lib/components/ColorSelect";
import { ColorTile } from "@lib/components/ColorTile";
import type { DropdownOption } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";
import { IconButton } from "@lib/components/IconButton";
import { Input } from "@lib/components/Input";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type {
    ExploredRegularEnsembleInfo,
    InternalDeltaEnsembleSetting,
    InternalRegularEnsembleSetting,
} from "../types";

export type DeltaEnsembleRowProps = {
    deltaEnsembleSetting: InternalDeltaEnsembleSetting;
    selectedRegularEnsembles: InternalRegularEnsembleSetting[];
    exploredRegularEnsembleInfos: ExploredRegularEnsembleInfo[];
    isDuplicate: boolean;
    isValid: boolean;
    onUpdate: (newItem: InternalDeltaEnsembleSetting) => void;
    onDelete: (item: InternalDeltaEnsembleSetting) => void;
    onRequestOtherComparisonEnsemble: (item: InternalDeltaEnsembleSetting) => void;
    onRequestOtherReferenceEnsemble: (item: InternalDeltaEnsembleSetting) => void;
};

const SELECT_OTHER_VALUE = "__selectOthers__";

function createEnsembleOptionValue(ensembleIdent: RegularEnsembleIdent): string {
    return ensembleIdent.toString();
}

function getEnsembleIdentFromDropdownValue(value: string): RegularEnsembleIdent {
    return RegularEnsembleIdent.fromString(value);
}

function makeExploredEnsembleDropdownOptions(ensembleItems: ExploredRegularEnsembleInfo[]): DropdownOption[] {
    return ensembleItems.map((ens) => ({
        value: createEnsembleOptionValue(ens.ensembleIdent),
        label: `${ens.ensembleIdent.getEnsembleName()} (${ens.caseName})`,
        adornment: <History fontSize="small" />,
    }));
}

function makeSelectedEnsembleDropdownOptions(ensembleItems: InternalRegularEnsembleSetting[]): DropdownOption[] {
    return ensembleItems.map((ens) => ({
        value: createEnsembleOptionValue(ens.ensembleIdent),
        label: ens.customName ?? `${ens.ensembleIdent.getEnsembleName()} (${ens.caseName})`,
        adornment: <ColorTile color={ens.color} />,
    }));
}

export function DeltaEnsembleRow(props: DeltaEnsembleRowProps): React.ReactNode {
    const { comparisonEnsembleIdent, referenceEnsembleIdent } = props.deltaEnsembleSetting;

    // Only show explored ensemble infos not among selected ensembles
    const nonSelectedRegularEnsembleInfos = props.exploredRegularEnsembleInfos.filter(
        (elm) => !props.selectedRegularEnsembles.some((ens) => ens.ensembleIdent.equals(elm.ensembleIdent)),
    );

    const selectedEnsembleDropdownOptions = makeSelectedEnsembleDropdownOptions(props.selectedRegularEnsembles);
    const exploredEnsembleDropdownOptions = makeExploredEnsembleDropdownOptions(nonSelectedRegularEnsembleInfos);
    const ensembleDropdownOptionsGroups = [
        ...selectedEnsembleDropdownOptions,
        ...exploredEnsembleDropdownOptions,
        {
            value: SELECT_OTHER_VALUE,
            label: "Select other ensemble...",
            adornment: <FolderOpen fontSize="small" />,
        },
    ];

    const comparisonEnsValue = comparisonEnsembleIdent ? createEnsembleOptionValue(comparisonEnsembleIdent) : null;
    const referenceEnsValue = referenceEnsembleIdent ? createEnsembleOptionValue(referenceEnsembleIdent) : null;

    function onColorChange(newColor: string) {
        props.onUpdate({
            ...props.deltaEnsembleSetting,
            color: newColor,
        });
    }

    function onNameChange(newName: string) {
        props.onUpdate({
            ...props.deltaEnsembleSetting,
            customName: newName || null,
        });
    }

    function onComparisonEnsembleChange(value: string) {
        if (value === SELECT_OTHER_VALUE) {
            props.onRequestOtherComparisonEnsemble({
                ...props.deltaEnsembleSetting,
                comparisonEnsembleIdent: null,
            });
            return;
        }

        const ens = getEnsembleIdentFromDropdownValue(value);
        props.onUpdate({
            ...props.deltaEnsembleSetting,
            comparisonEnsembleIdent: ens,
        });
    }

    function onReferenceEnsembleChange(value: string) {
        if (value === SELECT_OTHER_VALUE) {
            props.onRequestOtherReferenceEnsemble({
                ...props.deltaEnsembleSetting,
                referenceEnsembleIdent: null,
            });
            return;
        }

        const ens = getEnsembleIdentFromDropdownValue(value);

        props.onUpdate({
            ...props.deltaEnsembleSetting,
            referenceEnsembleIdent: ens,
        });
    }

    function onDelete() {
        props.onDelete(props.deltaEnsembleSetting);
    }

    return (
        <tr
            className={resolveClassNames("align-center ", {
                "hover:bg-red-50 odd:bg-red-200 even:bg-red-300": !props.isValid,
                "hover:bg-blue-50 odd:bg-blue-200 even:bg-blue-300": props.isValid && props.isDuplicate,
                "hover:bg-slate-100 odd:bg-slate-50": props.isValid && !props.isDuplicate,
            })}
        >
            <td className="p-2">
                <ColorSelect value={props.deltaEnsembleSetting.color} onChange={onColorChange} />
            </td>
            <td className="p-2">
                <Input
                    value={props.deltaEnsembleSetting.customName ?? ""}
                    placeholder="Give a custom name..."
                    onValueChange={onNameChange}
                />
            </td>
            <td className="p-2">
                <Dropdown
                    value={comparisonEnsValue}
                    options={ensembleDropdownOptionsGroups}
                    onChange={onComparisonEnsembleChange}
                />
            </td>
            <td className="p-2">
                <Dropdown
                    value={referenceEnsValue}
                    options={ensembleDropdownOptionsGroups}
                    onChange={onReferenceEnsembleChange}
                />
            </td>
            <td className="p-2">
                <IconButton color="danger" title="Remove delta ensemble from selection" onClick={onDelete}>
                    <Remove fontSize="small" />
                </IconButton>
            </td>
        </tr>
    );
}
