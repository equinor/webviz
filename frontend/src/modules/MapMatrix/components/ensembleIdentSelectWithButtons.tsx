import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { Dropdown } from "@lib/components/Dropdown";
import { IconButton } from "@lib/components/IconButton";
import ArrowCircleLeftIcon from "@mui/icons-material/ArrowCircleLeft";
import ArrowCircleRightIcon from "@mui/icons-material/ArrowCircleRight";

export type EnsembleIdentSelectWithButtonsProps = {
    name: string;
    ensembleIdents: EnsembleIdent[];
    value: EnsembleIdent | null;
    ensembleSet: EnsembleSet;
    onChange?: (values: EnsembleIdent | null) => void;
};
export const EnsembleIdentSelectWithButtons: React.FC<EnsembleIdentSelectWithButtonsProps> = (props) => {
    // Check if ensembleIdents are in in ensembleSet
    const availableEnsembles = props.ensembleSet
        .getEnsembleArr()
        .filter((ensemble) => props.ensembleIdents.includes(ensemble.getIdent()));

    const availableEnsembleOptions = availableEnsembles.map((ensemble) => ({
        value: ensemble.getIdent().toString(),
        label: ensemble.getDisplayName(),
    }));
    const handleSelectionChange = (identString: string) => {
        const ensembleIdent = EnsembleIdent.fromString(identString);
        props.onChange?.(ensembleIdent);
    };

    const changeSelection = (direction: "prev" | "next") => {
        const availableEnsembleIdentStrings = availableEnsembleOptions.map((option) => option.value);
        const currentIndex = availableEnsembleIdentStrings.indexOf(props.value?.toString() ?? "");
        let nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;

        if (nextIndex >= availableEnsembleIdentStrings.length) {
            nextIndex = 0;
        } else if (nextIndex < 0) {
            nextIndex = availableEnsembleIdentStrings.length - 1;
        }

        const nextValue = availableEnsembleIdentStrings[nextIndex];
        handleSelectionChange(nextValue);
    };

    return (
        <tr>
            <td className="px-6 py-0 whitespace-nowrap">{props.name}</td>
            <td className="px-6 py-0 w-full whitespace-nowrap">
                <Dropdown
                    options={availableEnsembleOptions}
                    value={props.value?.toString()}
                    onChange={handleSelectionChange}
                />
            </td>
            <td className="px-0 py-0 whitespace-nowrap text-right">
                <div className="flex justify-end">
                    <IconButton onClick={() => changeSelection("prev")}>
                        <ArrowCircleLeftIcon />
                    </IconButton>
                    <IconButton onClick={() => changeSelection("next")}>
                        <ArrowCircleRightIcon />
                    </IconButton>
                </div>
            </td>
        </tr>
    );
};
