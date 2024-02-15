import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleSettingsProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { MultiEnsembleSelect } from "@framework/components/MultiEnsembleSelect";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { useQueries, useQuery } from "@tanstack/react-query";

import { usePvtDataQueries } from "./queryHooks";
import { State } from "./state";

export function Settings({ workbenchSession }: ModuleSettingsProps<State>) {
    const ensembleSet = useEnsembleSet(workbenchSession);

    const [selectedEnsembleIdents, setSelectedEnsembleIdents] = React.useState<EnsembleIdent[]>([]);
    const [selectedPvtNums, setSelectedPvtNums] = React.useState<number[]>([]);

    const pvtDataQueries = usePvtDataQueries(selectedEnsembleIdents, [1]);

    function handleEnsembleSelectionChange(ensembleIdents: EnsembleIdent[]) {
        setSelectedEnsembleIdents(ensembleIdents);
    }

    function handlePvtNumChange(_: React.ChangeEvent<HTMLInputElement>, pvtNum: string | number) {
        setSelectedPvtNums([parseInt(String(pvtNum))]);
    }

    return (
        <div className="flex flex-col gap-2">
            <CollapsibleGroup title="Ensembles" expanded>
                <MultiEnsembleSelect
                    ensembleSet={ensembleSet}
                    onChange={handleEnsembleSelectionChange}
                    value={selectedEnsembleIdents}
                    size={5}
                />
            </CollapsibleGroup>
            <CollapsibleGroup title="PVT Num" expanded>
                <RadioGroup
                    options={pvtDataQueries.pvtNums.map((el) => ({ label: el, value: el }))}
                    value={selectedPvtNums[0] ?? undefined}
                    onChange={handlePvtNumChange}
                />
            </CollapsibleGroup>
        </div>
    );
}
