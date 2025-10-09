import React from "react";

import { FilterAlt } from "@mui/icons-material";
import { isEqual } from "lodash";

import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { type EnsembleRealizationFilterFunction } from "@framework/WorkbenchSession";
import { ColorTileWithBadge } from "@lib/components/ColorTileWithBadge";
import type { DropdownOption, DropdownProps } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";

export type EnsembleDropdownProps = (
    | {
          ensembles: readonly (RegularEnsemble | DeltaEnsemble)[];
          allowDeltaEnsembles: true;
          value: RegularEnsembleIdent | DeltaEnsembleIdent | null;
          onChange: (ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent) => void;
      }
    | {
          ensembles: readonly RegularEnsemble[];
          allowDeltaEnsembles?: false | undefined;
          value: RegularEnsembleIdent | null;
          onChange: (ensembleIdent: RegularEnsembleIdent) => void;
      }
) & {
    ensembleRealizationFilterFunction?: EnsembleRealizationFilterFunction;
} & Omit<DropdownProps<string>, "options" | "value" | "onChange">;

export function EnsembleDropdown(props: EnsembleDropdownProps): JSX.Element {
    const { onChange, ensembles, allowDeltaEnsembles, value, ensembleRealizationFilterFunction, ...rest } = props;

    const hasEffectiveRealizationFilter = React.useCallback(
        function hasEffectiveRealizationFilter(ens: RegularEnsemble | DeltaEnsemble | null): boolean {
            if (!ens || !ensembleRealizationFilterFunction) {
                return false;
            }

            const ensembleRealizations = [...ens.getRealizations()].toSorted();
            const filteredRealizations = [...ensembleRealizationFilterFunction(ens.getIdent())].toSorted();
            return !isEqual(filteredRealizations, ensembleRealizations);
        },
        [ensembleRealizationFilterFunction],
    );

    const handleSelectionChange = React.useCallback(
        function handleSelectionChange(selectedEnsembleIdentStr: string) {
            const foundEnsemble = ensembles.find(
                (ensemble) => ensemble.getIdent().toString() === selectedEnsembleIdentStr,
            );
            if (!foundEnsemble) {
                throw new Error(`Ensemble not found: ${selectedEnsembleIdentStr}`);
            }
            if (allowDeltaEnsembles) {
                onChange(foundEnsemble.getIdent());
                return;
            }
            if (foundEnsemble instanceof DeltaEnsemble) {
                throw new Error(
                    `Invalid ensemble selection: ${selectedEnsembleIdentStr}. Got delta ensemble when not allowed.`,
                );
            }
            onChange(foundEnsemble.getIdent());
        },
        [allowDeltaEnsembles, ensembles, onChange],
    );

    const optionsArray: DropdownOption[] = [];
    for (const ens of ensembles) {
        optionsArray.push({
            value: ens.getIdent().toString(),
            label: ens.getDisplayName(),
            adornment: (
                <span className="flex items-center w-7 h-7 ">
                    <ColorTileWithBadge
                        color={ens.getColor()}
                        badgeIcon={FilterAlt}
                        showBadge={hasEffectiveRealizationFilter(ens)}
                    />
                </span>
            ),
        });
    }

    return <Dropdown options={optionsArray} value={value?.toString()} onChange={handleSelectionChange} {...rest} />;
}
