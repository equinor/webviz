import React from "react";

import { EnsembleColorTile } from "@framework/components/EnsembleColorTile/ensembleColorTile";
import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import { isEnsembleRealizationFilterEffective } from "@framework/utils/realizationFilterUtils";
import type { EnsembleRealizationFilterFunction } from "@framework/WorkbenchSession";
import { Combobox } from "@lib/newComponents/Combobox";

export type EnsemblePickerProps = (
    | {
          ensembles: readonly (RegularEnsemble | DeltaEnsemble)[];
          allowDeltaEnsembles: true;
          value: (RegularEnsembleIdent | DeltaEnsembleIdent)[];
          onChange: (ensembleIdentArray: (RegularEnsembleIdent | DeltaEnsembleIdent)[]) => void;
      }
    | {
          ensembles: readonly RegularEnsemble[];
          allowDeltaEnsembles?: false | undefined;
          value: RegularEnsembleIdent[];
          onChange: (ensembleIdentArray: RegularEnsembleIdent[]) => void;
      }
) & {
    ensembleRealizationFilterFunction?: EnsembleRealizationFilterFunction;
};

export function EnsemblePicker(props: EnsemblePickerProps): JSX.Element {
    const { onChange, ensembles, value, allowDeltaEnsembles, ensembleRealizationFilterFunction } = props;

    const selectedArray = React.useMemo<string[]>(() => {
        return value.map((ident) => ident.toString());
    }, [value]);

    const optionsArray = React.useMemo(() => {
        return ensembles.map((ens) => ({
            value: ens.getIdent().toString(),
            label: ens.getDisplayName(),
        }));
    }, [ensembles]);

    const handleValueChange = React.useCallback(
        function handleValueChange(selectedEnsembleIdentStringArray: string[]) {
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

            if (!allowDeltaEnsembles) {
                const validIdentArray = identArray.filter((ident) =>
                    isEnsembleIdentOfType(ident, RegularEnsembleIdent),
                );
                onChange(validIdentArray);
                return;
            }
            onChange(identArray);
        },
        [allowDeltaEnsembles, ensembles, onChange],
    );

    const renderItemAdornment = React.useCallback(
        function renderItemAdornment(identStr: string) {
            const ensemble = ensembles.find((ens) => ens.getIdent().toString() === identStr) ?? null;
            if (!ensemble) return null;
            return (
                <EnsembleColorTile
                    ensemble={ensemble}
                    isRealizationFilterEffective={isEnsembleRealizationFilterEffective(
                        ensemble,
                        ensembleRealizationFilterFunction,
                    )}
                    wrapperClassName="w-2 h-2 mr-horizontal-xs"
                    size="small"
                />
            );
        },
        [ensembles, ensembleRealizationFilterFunction],
    );

    return (
        <Combobox
            items={optionsArray}
            value={selectedArray}
            multiple={true}
            onValueChange={handleValueChange}
            renderItemAdornment={renderItemAdornment}
            placeholder="Select ensembles..."
        />
    );
}
