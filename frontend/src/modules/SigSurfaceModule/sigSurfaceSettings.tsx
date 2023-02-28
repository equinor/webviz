import React from "react";
import { UseQueryResult } from "react-query";

import { Ensemble } from "@api";
import { ModuleFCProps } from "@framework/Module";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { Dropdown } from "@lib/components/Dropdown";
import { Select } from "@lib/components/Select";
import { ListBox, ListBoxItem } from "@lib/components/ListBox/list-box";
import { Input } from "@lib/components/Input";

import { useEnsemblesQuery } from "./sigSurfaceQueryHooks";
import { useDynamicSurfaceDirectoryQuery, useStaticSurfaceDirectoryQuery } from "./sigSurfaceQueryHooks";
import { SigSurfaceState } from "./sigSurfaceState";

//-----------------------------------------------------------------------------------------------------------
export function SigSurfaceSettings({ moduleContext, workbenchServices }: ModuleFCProps<SigSurfaceState>) {
    console.log("render SigSurfaceSettings");

    const caseUuid = useSubscribedValue("navigator.caseId", workbenchServices);
    const [ensembleName, setEnsembleName] = moduleContext.useStoreState("ensembleName");
    const [surfaceName, setSurfaceName] = moduleContext.useStoreState("surfaceName");
    const [surfaceAttribute, setSurfaceAttribute] = moduleContext.useStoreState("surfaceAttribute");
    const [realizationNum, setRealizationNum] = moduleContext.useStoreState("realizationNum");
    const [timeOrInterval, setTimeOrInterval] = moduleContext.useStoreState("timeOrInterval");

    const stashedEnsembleName = React.useRef("");

    const ensemblesQuery = useEnsemblesQuery(caseUuid);
    const dynamicSurfDirQuery = useDynamicSurfaceDirectoryQuery(caseUuid, ensembleName, true);
    const staticSurfDirQuery = useStaticSurfaceDirectoryQuery(caseUuid, ensembleName, true);

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

    // React.useEffect(
    //     function selectDefaultSurface() {
    //         console.log("selectDefaultSurface()");
    //         if (staticSurfDirQuery.data) {
    //             setSurfaceName(staticSurfDirQuery.data?.names[0]);
    //             setSurfaceAttribute(staticSurfDirQuery.data?.attributes[0]);
    //         } else {
    //             setSurfaceName(null);
    //             setSurfaceAttribute(null);
    //         }
    //     },
    //     [staticSurfDirQuery.data]
    // );

    React.useEffect(
        function selectDefaultSurface() {
            console.log("selectDefaultSurface()");
            if (dynamicSurfDirQuery.data) {
                setSurfaceName(dynamicSurfDirQuery.data?.names[0]);
                setSurfaceAttribute(dynamicSurfDirQuery.data?.attributes[0]);
                setTimeOrInterval(dynamicSurfDirQuery.data?.time_or_interval_strings[0]);

            } else {
                setSurfaceName(null);
                setSurfaceAttribute(null);
                setTimeOrInterval(null);
            }
        },
        [dynamicSurfDirQuery.data]
    );

    function handleEnsembleSelectionChange(ensembleName: string) {
        console.log("handleEnsembleSelectionChange()");
        setEnsembleName(ensembleName);
    }

    function handleSurfNameSelectionChange(surfName: string) {
        console.log("handleSurfNameSelectionChange()");
        setSurfaceName(surfName as string);
    }

    function handleSurfAttributeSelectionChange(attributeName: string) {
        console.log("handleSurfAttributeSelectionChange()");
        setSurfaceAttribute(attributeName);
    }

    function handleTimeOrIntervalSelectionChange(timeOrInterval: string) {
        console.log("handleTimeOrIntervalSelectionChange()");
        setTimeOrInterval(timeOrInterval);
    }

    function handleRealizationTextChanged(event: React.ChangeEvent<HTMLInputElement>) {
        console.log("handleRealizationTextChanged() " + event.target.value);
        const realNum = parseInt(event.target.value, 10)
        if (realNum >= 0) {
            setRealizationNum(realNum);
        }
    }

    // const surfNameOptions = staticSurfDirQuery.data?.names.map((name) => ({ value: name, label: name })) ?? [];
    // const surfAttributeOptions = staticSurfDirQuery.data?.attributes.map((attr) => ({ value: attr, label: attr })) ?? [];

    const surfNameOptions = dynamicSurfDirQuery.data?.names.map((name) => ({ value: name, label: name })) ?? [];
    const surfAttributeOptions = dynamicSurfDirQuery.data?.attributes.map((attr) => ({ value: attr, label: attr })) ?? [];
    const timeOrIntervalOptions = dynamicSurfDirQuery.data?.time_or_interval_strings.map((time) => ({ value: time, label: time })) ?? [];

    return (
        <>
            <label>Ensemble:</label>
            <EnsemblesDropdown
                ensemblesQuery={ensemblesQuery}
                selectedEnsemble={ensembleName}
                onEnsembleSelectionChange={handleEnsembleSelectionChange}
            />

            <label>Surface name:</label>
            <Select
                options={surfNameOptions}
                value={surfaceName ?? ""}
                onChange={handleSurfNameSelectionChange}
                size={5}
            />
            <label>Surface attribute:</label>
            <Select
                options={surfAttributeOptions}
                value={surfaceAttribute ?? ""}
                onChange={handleSurfAttributeSelectionChange}
                size={5}
            />
            <label>Time or interval:</label>
            <Select
                options={timeOrIntervalOptions}
                value={timeOrInterval ?? ""}
                onChange={handleTimeOrIntervalSelectionChange}
                size={5}
            />
            <label>
                Realizations:
                <Input type={"number"} value={realizationNum} onChange={handleRealizationTextChanged} />
            </label>
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
