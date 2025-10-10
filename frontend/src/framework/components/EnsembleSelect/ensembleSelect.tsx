import React from "react";

import { FilterAlt } from "@mui/icons-material";

import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import { isEnsembleRealizationFilterEffective } from "@framework/utils/realizationFilterUtils";
import type { EnsembleRealizationFilterFunction } from "@framework/WorkbenchSession";
// import { ColorTile } from "@lib/components/ColorTile";
import { ColorTileWithBadge } from "@lib/components/ColorTileWithBadge";
import type { SelectOption, SelectProps } from "@lib/components/Select";
import { Select } from "@lib/components/Select";

export type EnsembleSelectProps = (
    | {
          ensembles: readonly (RegularEnsemble | DeltaEnsemble)[];
          multiple?: boolean;
          allowDeltaEnsembles: true;
          value: (RegularEnsembleIdent | DeltaEnsembleIdent)[];
          onChange: (ensembleIdentArray: (RegularEnsembleIdent | DeltaEnsembleIdent)[]) => void;
      }
    | {
          ensembles: readonly RegularEnsemble[];
          multiple?: boolean;
          allowDeltaEnsembles?: false | undefined;
          value: RegularEnsembleIdent[];
          onChange: (ensembleIdentArray: RegularEnsembleIdent[]) => void;
      }
) & { ensembleRealizationFilterFunction?: EnsembleRealizationFilterFunction } & Omit<
        SelectProps<string>,
        "options" | "value" | "onChange"
    >;

export function EnsembleSelect(props: EnsembleSelectProps): JSX.Element {
    const { onChange, ensembles, value, allowDeltaEnsembles, multiple, ensembleRealizationFilterFunction, ...rest } =
        props;

    const hasEffectiveRealizationFilter = React.useCallback(
        function hasEffectiveRealizationFilter(ens: RegularEnsemble | DeltaEnsemble | null): boolean {
            return isEnsembleRealizationFilterEffective(ens, ensembleRealizationFilterFunction);
        },
        [ensembleRealizationFilterFunction],
    );

    const handleSelectionChange = React.useCallback(
        function handleSelectionChanged(selectedEnsembleIdentStringArray: string[]) {
            const identArray: (RegularEnsembleIdent | DeltaEnsembleIdent)[] = [];
            for (const identStr of selectedEnsembleIdentStringArray) {
                const foundEnsemble = ensembles.find((ens) => ens.getIdent().toString() === identStr);
                if (!foundEnsemble) {
                    throw new Error(`Ensemble not found: ${identStr}`);
                }
                if (!allowDeltaEnsembles && foundEnsemble instanceof DeltaEnsemble) {
                    throw new Error(`Invalid ensemble selection: ${identStr}. Got delta ensemble when not allowed.`);
                }
                identArray.push(foundEnsemble.getIdent());
            }

            // Filter to match the correct return type before calling onChange
            if (!allowDeltaEnsembles) {
                const validIdentArray = identArray.filter((ident) =>
                    isEnsembleIdentOfType(ident, RegularEnsembleIdent),
                ) as RegularEnsembleIdent[];
                onChange(validIdentArray);
                return;
            }
            onChange(identArray);
        },
        [allowDeltaEnsembles, ensembles, onChange],
    );

    const optionsArray: SelectOption[] = [];
    for (const ens of ensembles) {
        optionsArray.push({
            value: ens.getIdent().toString(),
            label: ens.getDisplayName(),
            adornment: (
                <span className="flex items-center w-6">
                    <ColorTileWithBadge
                        color={ens.getColor()}
                        badgeIcon={FilterAlt}
                        showBadge={hasEffectiveRealizationFilter(ens)}
                    />
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
            optionHeight={30}
            onChange={handleSelectionChange}
            multiple={isMultiple}
            {...rest}
        />
    );
}
