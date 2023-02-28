import React from "react";
import { UseQueryResult, useQuery } from "react-query";

import { Ensemble, Frequency, VectorDescription } from "@api";
import { apiService } from "@framework/ApiService";
import { ModuleFCProps } from "@framework/Module";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { Dropdown } from "@lib/components/Dropdown";
import { Input } from "@lib/components/Input";
import { ListBox, ListBoxItem } from "@lib/components/ListBox/list-box";

import { sortBy, sortedUniq } from "lodash";

import { useEnsemblesQuery } from "./sigSurfaceQueryHooks";
import { SigSurfaceState } from "./sigSurfaceState";

//-----------------------------------------------------------------------------------------------------------
export function SigSurfaceSettings({ moduleContext, workbenchServices }: ModuleFCProps<SigSurfaceState>) {
    console.log("render SigSurfaceSettings");

    const caseUuid = useSubscribedValue("navigator.caseId", workbenchServices);
    const [ensembleName, setEnsembleName] = moduleContext.useStoreState("ensembleName");
    const stashedEnsembleName = React.useRef("");

    const ensemblesQuery = useEnsemblesQuery(caseUuid);

    React.useEffect(
        function selectDefaultEnsemble() {
            console.log(`selectDefaultEnsemble() - data ${ensemblesQuery.data ? "yes" : "no"}`);
            if (ensemblesQuery.data) {
                const candidateName = ensembleName ?? stashedEnsembleName.current;
                setEnsembleName(fixupSelectedEnsembleName(candidateName, ensemblesQuery.data));
            } else {
                stashedEnsembleName.current = ensembleName ?? "";
            }
        },
        [ensemblesQuery.data]
    );

    function handleEnsembleSelectionChange(ensembleName: string) {
        console.log("handleEnsembleSelectionChange()");
        setEnsembleName(ensembleName);
    }

    return (
        <>
            <label>Ensemble:</label>
            <EnsemblesDropdown
                ensemblesQuery={ensemblesQuery}
                selectedEnsemble={ensembleName}
                onEnsembleSelectionChange={handleEnsembleSelectionChange}
            />
        </>
    );
}

function fixupSelectedEnsembleName(currName: string | null, ensemblesArr: Ensemble[] | null): string | null {
    const ensembleNames = ensemblesArr ? ensemblesArr.map((item) => item.name) : [];
    if (currName && ensembleNames.includes(currName)) {
        return currName;
    }

    if (ensembleNames.length > 0) {
        return ensembleNames[0];
    }

    return null;
}


type EnsemblesDropdownProps = {
    ensemblesQuery: UseQueryResult<Ensemble[]>;
    selectedEnsemble: string | null;
    onEnsembleSelectionChange: (ensembleName: string) => void;
};


const EnsemblesDropdown = ({ ensemblesQuery, selectedEnsemble, onEnsembleSelectionChange }: EnsemblesDropdownProps) => {
    const itemArr: ListBoxItem[] = [];

    if (ensemblesQuery.isSuccess && ensemblesQuery.data.length > 0) {
        for (const ens of ensemblesQuery.data) {
            itemArr.push({ value: ens.name, label: ens.name });
        }
    } else {
        let placeholderStr = "<no ensembles>";
        if (ensemblesQuery.isError || ensemblesQuery.isLoading) {
            placeholderStr = `${ensemblesQuery.status.toString()}...`;
        }

        itemArr.push({ value: "", label: placeholderStr, disabled: true });
        selectedEnsemble = "";
    }

    console.log("render EnsemblesDropdown - selectedEnsemble=" + selectedEnsemble);

    return <ListBox items={itemArr} selectedItem={selectedEnsemble ?? ""} onSelect={onEnsembleSelectionChange} />;
};
