import React from "react";

import { useSetAtom } from "jotai";
import { useAtom } from "jotai";

import type { SurfaceStatisticFunction_api } from "@api";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import type { ModuleSettingsProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { SyncSettingKey, useRefStableSyncSettingsHelper } from "@framework/SyncSettings";
import { fixupRegularEnsembleIdent, maybeAssignFirstSyncedEnsemble } from "@framework/utils/ensembleUiHelpers";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { Checkbox } from "@lib/components/Checkbox";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { QueryStateWrapper } from "@lib/components/QueryStateWrapper";
import { RadioGroup } from "@lib/components/RadioGroup";
import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";
import { usePropagateQueryErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";

import type { Interfaces } from "../interfaces";

import { displayableDataAtom } from "./atoms/baseAtoms";
import { selectedTableNameAtom } from "./atoms/baseAtoms";

//-----------------------------------------------------------------------------------------------------------
export function DbgLroTestingSettings(props: ModuleSettingsProps<Interfaces>) {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = React.useState<RegularEnsembleIdent | null>(null);
    const [selectedTableName, setSelectedTableName] = useAtom(selectedTableNameAtom);

    const statusWriter = useSettingsStatusWriter(props.settingsContext);

    const setDisplayableData = useSetAtom(displayableDataAtom);


    const computedEnsembleIdent = fixupRegularEnsembleIdent(selectedEnsembleIdent, ensembleSet);

    if (computedEnsembleIdent && !computedEnsembleIdent.equals(selectedEnsembleIdent)) {
        setSelectedEnsembleIdent(computedEnsembleIdent);
    }

    function handleEnsembleSelectionChange(newEnsembleIdent: RegularEnsembleIdent | null) {
        console.debug(`handleEnsembleSelectionChange(${newEnsembleIdent})`);
        setSelectedEnsembleIdent(newEnsembleIdent);
        if (newEnsembleIdent) {
            setDisplayableData({
                infoString: `Selected ensemble: ${newEnsembleIdent.toString()}`,
            });
        } else {
            setDisplayableData(null);
        }
    }

    function handleTableSelectionChange(newTableName: string | null) {
        console.debug(`handleTableSelectionChange(${newTableName})`);
        setSelectedTableName(newTableName);
    }

    const tableNames = ["table1", "table2", "table3"];
    const tableNameOptions: DropdownOption[] = tableNames.map((tableName) => ({ value: tableName, label: tableName }));

    return (
        <>
            <div className="flex flex-col gap-2">
                <Label text="Ensemble:">
                    <EnsembleDropdown
                        ensembles={ensembleSet.getRegularEnsembleArray()}
                        value={computedEnsembleIdent}
                        onChange={handleEnsembleSelectionChange}
                    />
                </Label>
                <Label text="Table name:">
                    <Dropdown
                        options={tableNameOptions}
                        value={selectedTableName ?? ""}
                        onChange={handleTableSelectionChange}
                    />
                </Label>
            </div>
        </>
    );
}
