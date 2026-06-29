import React from "react";

import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { isEnsembleRealizationFilterEffective } from "@framework/utils/realizationFilterUtils";
import { type EnsembleRealizationFilterFunction } from "@framework/WorkbenchSession";
import { Combobox, type ComboboxProps } from "@lib/components/Combobox/combobox";
import { ComboboxCompositions } from "@lib/components/Combobox/compositions";
import type { WithBrowseButtonsProps } from "@lib/components/Combobox/compositions/withBrowseButtons";
import type { ComboboxItem } from "@lib/components/Combobox/types";

import { EnsembleColorTile } from "../EnsembleColorTile";

export type EnsembleDropdownProps = (
    | {
          ensembles: readonly (RegularEnsemble | DeltaEnsemble)[];
          allowDeltaEnsembles: true;
          value: RegularEnsembleIdent | DeltaEnsembleIdent | null;
          onValueChange: (ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent) => void;
      }
    | {
          ensembles: readonly RegularEnsemble[];
          allowDeltaEnsembles?: false | undefined;
          value: RegularEnsembleIdent | null;
          onValueChange: (ensembleIdent: RegularEnsembleIdent) => void;
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
    const {
        onValueChange: onChange,
        ensembles,
        allowDeltaEnsembles,
        value,
        ensembleRealizationFilterFunction,
        ...rest
    } = props;

    const optionsArray = React.useMemo<ComboboxItem<string>[]>(() => {
        return ensembles.map((ens) => ({
            value: ens.getIdent().toString(),
            label: ens.getDisplayName(),
        }));
    }, [ensembles]);

    const ensembleByIdentStr = React.useMemo(
        () => new Map(ensembles.map((ens) => [ens.getIdent().toString(), ens])),
        [ensembles],
    );

    const renderItemAdornment = React.useCallback(
        function renderItemAdornment(identStr: string) {
            const ens = ensembleByIdentStr.get(identStr);
            if (!ens) return null;
            return (
                <EnsembleColorTile
                    ensemble={ens}
                    isRealizationFilterEffective={isEnsembleRealizationFilterEffective(
                        ens,
                        ensembleRealizationFilterFunction,
                    )}
                    wrapperClassName="w-4 h-4"
                    size="small"
                />
            );
        },
        [ensembleByIdentStr, ensembleRealizationFilterFunction],
    );

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
                {...rest}
                items={optionsArray}
                value={value?.toString()}
                onValueChange={handleSelectionChange}
                renderItemAdornment={renderItemAdornment}
            />
        );
    }

    return (
        <Combobox
            {...rest}
            items={optionsArray}
            value={value?.toString()}
            onValueChange={handleSelectionChange}
            renderItemAdornment={renderItemAdornment}
        />
    );
}
