import React from "react";

import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import { type EnsembleRealizationFilterFunction } from "@framework/WorkbenchSession";
import { TagPicker, type TagOption } from "@lib/components/TagPicker";

import { EnsembleTag } from "./private-components/ensembleTag";
import { EnsembleTagOption } from "./private-components/ensembleTagOption";

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

    const optionsArray = React.useMemo<TagOption[]>(() => {
        return ensembles.map((ens) => ({
            value: ens.getIdent().toString(),
            label: ens.getDisplayName(),
        }));
    }, [ensembles]);

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
                );
                onChange(validIdentArray);
                return;
            }
            onChange(identArray);
        },
        [allowDeltaEnsembles, ensembles, onChange],
    );

    return (
        <TagPicker
            selection={selectedArray}
            tagOptions={optionsArray}
            inputProps={{
                // Makes input size match tag height
                className: "border border-transparent py-1",
            }}
            onChange={handleSelectionChange}
            renderTag={(props) => (
                <EnsembleTag
                    ensembles={ensembles}
                    ensembleRealizationFilterFunction={ensembleRealizationFilterFunction}
                    {...props}
                />
            )}
            renderTagOption={(props) => (
                <EnsembleTagOption
                    ensembles={ensembles}
                    ensembleRealizationFilterFunction={ensembleRealizationFilterFunction}
                    {...props}
                />
            )}
            placeholder="Select ensembles..."
        />
    );
}
