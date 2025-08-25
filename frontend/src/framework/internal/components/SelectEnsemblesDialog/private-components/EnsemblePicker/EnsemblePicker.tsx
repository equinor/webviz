import React from "react";

import { Add, Check } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";

import { getFieldsOptions, type EnsembleInfo_api } from "@api";
import type { UserEnsembleSetting } from "@framework/internal/EnsembleSetLoader";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { QueryStateWrapper } from "@lib/components/QueryStateWrapper";
import { Select, type SelectOption } from "@lib/components/Select";
import { useValidState } from "@lib/hooks/useValidState";

import type { InternalRegularEnsembleSetting } from "../../types";

import { readInitialStateFromLocalStorage, storeStateInLocalStorage } from "./_utils";
import { CaseExplorer, type CaseSelection } from "./CaseExplorer";

export type EnsemblePickerProps = {
    nextEnsembleColor: string;
    selectedEnsembles: UserEnsembleSetting[];
    pickButtonLabel?: string;
    onPickEnsemble: (newEnsemble: InternalRegularEnsembleSetting) => void;
};

export function EnsemblePicker(props: EnsemblePickerProps): React.ReactNode {
    const [selectedCaseName, setSelectedCaseName] = React.useState<string>("");
    const [selectedCaseUuid, setSelectedCaseUuid] = React.useState<string>("");
    const [selectedCaseEnsembles, setSelectedCaseEnsembles] = React.useState<EnsembleInfo_api[] | null>(null);

    // --- Queries ---
    const fieldsQuery = useQuery({ ...getFieldsOptions() });
    const fieldOptions = fieldsQuery.data?.map((f) => ({ value: f.fieldIdentifier, label: f.fieldIdentifier })) ?? [];

    const [selectedField, setSelectedField] = useValidState<string>({
        initialState: readInitialStateFromLocalStorage("selectedField"),
        validStates: fieldsQuery.data?.map((item) => item.fieldIdentifier) ?? [],
        keepStateWhenInvalid: true,
    });

    // --- Derived data ---
    const [selectedEnsembleName, setSelectedEnsembleName] = useValidState<string>({
        initialState: "",
        validStates: selectedCaseEnsembles?.map((ens) => ens.name) ?? [],
        keepStateWhenInvalid: true,
    });

    const selectedEnsemble = React.useMemo(() => {
        return selectedCaseEnsembles?.find((ens) => ens.name === selectedEnsembleName) ?? null;
    }, [selectedCaseEnsembles, selectedEnsembleName]);

    const ensembleOptions: SelectOption<string>[] =
        selectedCaseEnsembles?.map((e) => ({
            label: `${e.name}  (${e.realizationCount} reals)`,
            value: e.name,
        })) ?? [];

    let selectedEnsembleIdent: RegularEnsembleIdent | null = null;
    try {
        selectedEnsembleIdent = new RegularEnsembleIdent(selectedCaseUuid, selectedEnsembleName);
    } catch {
        selectedEnsembleIdent = null;
    }
    const ensembleAlreadySelected =
        selectedCaseUuid &&
        selectedEnsembleName &&
        props.selectedEnsembles.some((el) => el.ensembleIdent.equals(selectedEnsembleIdent));

    function handleFieldChanged(fieldIdentifier: string) {
        storeStateInLocalStorage("selectedField", fieldIdentifier);
        setSelectedField(fieldIdentifier);
    }

    function handleRegularEnsembleChanged(ensembleNames: string[]) {
        setSelectedEnsembleName(ensembleNames[0]);
    }

    function handleSelectRegularEnsemble() {
        if (ensembleAlreadySelected) return;
        if (!selectedEnsemble) return;

        props.onPickEnsemble({
            ensembleIdent: new RegularEnsembleIdent(selectedCaseUuid, selectedEnsembleName),
            caseName: selectedCaseName,
            color: props.nextEnsembleColor,
            customName: null,
        });
    }

    function handleCaseSelectedChange(caseSelection: CaseSelection) {
        setSelectedCaseName(caseSelection.caseName);
        setSelectedCaseUuid(caseSelection.caseUuid);
        setSelectedCaseEnsembles(caseSelection.filteredEnsembles ? [...caseSelection.filteredEnsembles] : []);
    }

    return (
        <div className="flex flex-col gap-4 p-4 border-r bg-slate-100 h-full rounded-md">
            <Label text="Field">
                <QueryStateWrapper
                    queryResult={fieldsQuery}
                    errorComponent={<div className="text-red-500">Error loading fields</div>}
                    loadingComponent={<CircularProgress />}
                >
                    <Dropdown
                        options={fieldOptions}
                        value={selectedField}
                        onChange={handleFieldChanged}
                        disabled={fieldOptions.length === 0}
                    />
                </QueryStateWrapper>
            </Label>
            <Label text="Case">
                <CaseExplorer field={selectedField} onCaseSelectionChange={handleCaseSelectedChange} />
            </Label>
            <Label text="Ensemble">
                <Select
                    options={ensembleOptions}
                    value={[selectedEnsembleName]}
                    onChange={handleRegularEnsembleChanged}
                    disabled={selectedCaseEnsembles === null}
                    size={5}
                    width="100%"
                />
            </Label>
            <div className="flex justify-end">
                <Button
                    variant="contained"
                    onClick={handleSelectRegularEnsemble}
                    color={ensembleAlreadySelected ? "success" : "primary"}
                    disabled={ensembleAlreadySelected || ensembleOptions.length === 0}
                    startIcon={ensembleAlreadySelected ? <Check fontSize="small" /> : <Add fontSize="small" />}
                >
                    {ensembleAlreadySelected
                        ? "Ensemble already selected"
                        : (props.pickButtonLabel ?? "Select Ensemble")}
                </Button>
            </div>
        </div>
    );
}
