import React from "react";

import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { isEnsembleRealizationFilterEffective } from "@framework/utils/realizationFilterUtils";
import { type EnsembleRealizationFilterFunction } from "@framework/WorkbenchSession";
import { Combobox, type ComboboxProps } from "@lib/newComponents/Combobox/combobox";
import { ComboboxCompositions } from "@lib/newComponents/Combobox/compositions";
import type { WithBrowseButtonsProps } from "@lib/newComponents/Combobox/compositions/withBrowseButtons";
import type { ComboboxItem } from "@lib/newComponents/Combobox/types";

import { EnsembleColorTile } from "../EnsembleColorTile";

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
} & (
        | ({
              showBrowseButtons: true;
          } & Omit<WithBrowseButtonsProps<string>, "items" | "value" | "onValueChange">)
        | ({
              showBrowseButtons?: false | undefined;
          } & Omit<ComboboxProps<string>, "items" | "value" | "onValueChange">)
    );

export function EnsembleDropdown(props: EnsembleDropdownProps): JSX.Element {
    const { onChange, ensembles, allowDeltaEnsembles, value, ensembleRealizationFilterFunction, ...rest } = props;

    const optionsArray = React.useMemo<ComboboxItem<string>[]>(() => {
        return ensembles.map((ens) => ({
            value: ens.getIdent().toString(),
            label: ens.getDisplayName(),
            adornment: (
                <EnsembleColorTile
                    ensemble={ens}
                    isRealizationFilterEffective={isEnsembleRealizationFilterEffective(
                        ens,
                        ensembleRealizationFilterFunction,
                    )}
                    wrapperClassName="w-7 h-7"
                />
            ),
        }));
    }, [ensembles, ensembleRealizationFilterFunction]);

    const handleSelectionChange = React.useCallback(
        function handleSelectionChange(selectedEnsembleIdentStr: string | null) {
            if (selectedEnsembleIdentStr === null) {
                return;
            }
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

    if (props.showBrowseButtons) {
        return (
            <ComboboxCompositions.WithBrowseButtons
                items={optionsArray}
                value={value?.toString()}
                onValueChange={handleSelectionChange}
                {...rest}
            />
        );
    }

    return <Combobox items={optionsArray} value={value?.toString()} onValueChange={handleSelectionChange} {...rest} />;
}
