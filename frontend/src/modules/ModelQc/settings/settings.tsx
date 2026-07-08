import type React from "react";

import { useAtom, useAtomValue } from "jotai";

import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import type { ModuleSettingsProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { Collapsible } from "@lib/components/Collapsible";
import { Combobox } from "@lib/components/Combobox";
import { NumberInput } from "@lib/components/NumberInput";
import { Setting } from "@lib/components/Setting";
import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";

import type { Interfaces } from "../interfaces";

import { gridCheckThresholdAtom } from "./atoms/baseAtoms";
import { availableGridNamesAtom } from "./atoms/derivedAtoms";
import { selectedEnsembleIdentAtom, selectedGridNameAtom } from "./atoms/persistableFixableAtoms";

export function Settings(props: ModuleSettingsProps<Interfaces>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const ensembleRealizationFilterFunc = useEnsembleRealizationFilterFunc(props.workbenchSession);

    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = useAtom(selectedEnsembleIdentAtom);
    const [selectedGridName, setSelectedGridName] = useAtom(selectedGridNameAtom);
    const [gridCheckThreshold, setGridCheckThreshold] = useAtom(gridCheckThresholdAtom);

    const availableGridNames = useAtomValue(availableGridNamesAtom);

    const selectedEnsembleIdentAnnotations = useMakePersistableFixableAtomAnnotations(selectedEnsembleIdentAtom);
    const selectedGridNameAnnotations = useMakePersistableFixableAtomAnnotations(selectedGridNameAtom);

    function handleEnsembleSelectionChange(newEnsembleIdent: RegularEnsembleIdent | null) {
        setSelectedEnsembleIdent(newEnsembleIdent);
    }

    return (
        <Setting.Panel>
            <Setting.Section title="Data source" defaultOpen>
                <Setting.Field label="Ensemble" annotations={selectedEnsembleIdentAnnotations}>
                    <EnsembleDropdown
                        ensembles={ensembleSet.getRegularEnsembleArray()}
                        value={selectedEnsembleIdent.value}
                        ensembleRealizationFilterFunction={ensembleRealizationFilterFunc}
                        onValueChange={handleEnsembleSelectionChange}
                    />
                </Setting.Field>
                <Setting.Field
                    label="Grid model"
                    annotations={selectedGridNameAnnotations}
                    help={{
                        title: "Grid model",
                        content:
                            "The 3D grid model whose dynamic properties are checked, and whose first two " +
                            "time steps define t0 and t1 for the equilibrium check.",
                    }}
                >
                    <Combobox
                        items={availableGridNames.map((gridName) => ({ label: gridName, value: gridName }))}
                        value={selectedGridName.value ?? undefined}
                        onValueChange={(value) => value !== null && setSelectedGridName(value)}
                        placeholder="Select grid model..."
                    />
                </Setting.Field>
            </Setting.Section>
            <Setting.Section title="Grid property check" defaultOpen>
                <Setting.Field
                    label="Relative change threshold"
                    help={{
                        title: "Relative change threshold",
                        content:
                            "Max allowed relative change of a dynamic grid property between t0 and t1 for a " +
                            "realization to pass the grid property check.",
                    }}
                >
                    <NumberInput
                        value={gridCheckThreshold}
                        min={0.00000}
                        onValueChange={(value) => value !== null && setGridCheckThreshold(value)}
                    />
                </Setting.Field>
            </Setting.Section>
        </Setting.Panel>
    );
}
