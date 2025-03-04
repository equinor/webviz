import React from "react";

import type { CaseInfo_api} from "@api";
import { getCasesOptions, getEnsemblesOptions, getFieldsOptions } from "@api";
import { useAuthProvider } from "@framework/internal/providers/AuthProvider";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { ColorSelect } from "@lib/components/ColorSelect";
import { Dialog } from "@lib/components/Dialog";
import { Dropdown } from "@lib/components/Dropdown";
import { IconButton } from "@lib/components/IconButton";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { QueryStateWrapper } from "@lib/components/QueryStateWrapper";
import { Select } from "@lib/components/Select";
import { Switch } from "@lib/components/Switch";
import type { TableSelectOption } from "@lib/components/TableSelect";
import { TableSelect } from "@lib/components/TableSelect";
import { useValidState } from "@lib/hooks/useValidState";
import type { ColorSet } from "@lib/utils/ColorSet";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Add, Check, Info, Remove } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";

import { isEqual } from "lodash";
import { v4 } from "uuid";

import { UserAvatar } from "./private-components/userAvatar";

import { LoadingOverlay } from "../LoadingOverlay";

const CASE_UUID_ENSEMBLE_NAME_SEPARATOR = "~@@~";

const STALE_TIME = 0;
const CACHE_TIME = 5 * 60 * 1000;

// Base item for ensemble data
export type BaseEnsembleItem = {
    caseUuid: string;
    ensembleName: string;
};

// Internal type before applying created delta ensemble externally
type InternalDeltaEnsembleItem = {
    comparisonEnsemble: BaseEnsembleItem | null; // Allows null
    referenceEnsemble: BaseEnsembleItem | null; // Allows null
    uuid: string; // To allow for equal comparison and reference ensembles during editing in the dialog
    color: string;
    customName: string | null;
};

export type DeltaEnsembleItem = {
    comparisonEnsemble: BaseEnsembleItem;
    referenceEnsemble: BaseEnsembleItem;
    color: string;
    customName: string | null;
};
export type RegularEnsembleItem = BaseEnsembleItem & {
    caseName: string;
    color: string;
    customName: string | null;
};

export type SelectEnsemblesDialogProps = {
    loadAndSetupEnsembles: (
        selectedRegularEnsembles: RegularEnsembleItem[],
        createdDeltaEnsembles: DeltaEnsembleItem[]
    ) => Promise<void>;
    onClose: () => void;
    selectedRegularEnsembles: RegularEnsembleItem[];
    createdDeltaEnsembles: DeltaEnsembleItem[];
    colorSet: ColorSet;
};

interface CaseFilterSettings {
    keep: boolean;
    onlyMyCases: boolean;
    users: string[];
}

function readInitialStateFromLocalStorage(stateName: string): string {
    const storedState = localStorage.getItem(stateName);
    if (storedState && typeof storedState === "string") {
        return storedState;
    }
    return "";
}

function storeStateInLocalStorage(stateName: string, value: string) {
    localStorage.setItem(stateName, value);
}

export const SelectEnsemblesDialog: React.FC<SelectEnsemblesDialogProps> = (props) => {
    const [isLoadingEnsembles, setIsLoadingEnsembles] = React.useState<boolean>(false);
    const [confirmCancel, setConfirmCancel] = React.useState<boolean>(false);
    const [newlySelectedRegularEnsembles, setNewlySelectedRegularEnsembles] = React.useState<RegularEnsembleItem[]>([]);
    const [casesFilteringOptions, setCasesFilteringOptions] = React.useState<CaseFilterSettings>({
        keep: !(readInitialStateFromLocalStorage("showKeepCases") === "false"),
        onlyMyCases: readInitialStateFromLocalStorage("showOnlyMyCases") === "true",
        users: [],
    });

    const [deltaEnsembles, setDeltaEnsembles] = React.useState<InternalDeltaEnsembleItem[]>([]);

    const { userInfo } = useAuthProvider();

    React.useLayoutEffect(() => {
        setNewlySelectedRegularEnsembles(props.selectedRegularEnsembles);
    }, [props.selectedRegularEnsembles]);

    React.useLayoutEffect(() => {
        setDeltaEnsembles(
            props.createdDeltaEnsembles.map((elm) => ({
                comparisonEnsemble: elm.comparisonEnsemble,
                referenceEnsemble: elm.referenceEnsemble,
                uuid: v4(),
                color: elm.color,
                customName: elm.customName,
            }))
        );
    }, [props.createdDeltaEnsembles]);

    const fieldsQuery = useQuery({
        ...getFieldsOptions(),
    });

    const [selectedField, setSelectedField] = useValidState<string>({
        initialState: readInitialStateFromLocalStorage("selectedField"),
        validStates: fieldsQuery.data?.map((item) => item.field_identifier) ?? [],
        keepStateWhenInvalid: true,
    });

    const casesQuery = useQuery({
        ...getCasesOptions({
            query: {
                field_identifier: selectedField,
            },
        }),
        enabled: fieldsQuery.isSuccess,
        gcTime: CACHE_TIME,
        staleTime: STALE_TIME,
    });

    const [selectedCaseId, setSelectedCaseId] = useValidState<string>({
        initialState: "",
        validStates: filterCases(casesQuery.data)?.map((item) => item.uuid) ?? [],
        keepStateWhenInvalid: true,
    });

    const ensemblesQuery = useQuery({
        ...getEnsemblesOptions({
            path: {
                case_uuid: selectedCaseId,
            },
        }),
        enabled: casesQuery.isSuccess,
        gcTime: CACHE_TIME,
        staleTime: STALE_TIME,
    });

    const [selectedRegularEnsembleName, setSelectedRegularEnsembleName] = useValidState<string>({
        initialState: "",
        validStates: ensemblesQuery.data?.map((el) => el.name) ?? [],
        keepStateWhenInvalid: true,
    });

    function handleFieldChanged(fieldIdentifier: string) {
        storeStateInLocalStorage("selectedField", fieldIdentifier);
        setSelectedField(fieldIdentifier);
    }

    function handleCaseChanged(caseUuids: string[]) {
        setSelectedCaseId(caseUuids[0]);
    }

    function handleRegularEnsembleChanged(ensembleNames: string[]) {
        setSelectedRegularEnsembleName(ensembleNames[0]);
    }

    function checkIfRegularEnsembleAlreadySelected(): boolean {
        if (
            !selectedCaseId ||
            !selectedRegularEnsembleName ||
            !newlySelectedRegularEnsembles.some(
                (e) => e.caseUuid === selectedCaseId && e.ensembleName === selectedRegularEnsembleName
            )
        ) {
            return false;
        }
        return true;
    }

    function tryToFindUnusedColor(): string {
        const usedColors = [
            ...newlySelectedRegularEnsembles.map((e) => e.color),
            ...deltaEnsembles.map((e) => e.color),
        ];
        for (let i = 0; i < props.colorSet.getColorArray().length; i++) {
            const candidateColor = props.colorSet.getColor(i);
            if (!usedColors.includes(candidateColor)) {
                return candidateColor;
            }
        }
        return props.colorSet.getColor(newlySelectedRegularEnsembles.length);
    }

    function handleDeltaEnsembleComparisonEnsembleChange(
        deltaEnsembleUuid: string,
        newCaseUuidAndEnsembleNameString: string
    ) {
        const { caseUuid: newComparisonEnsembleCaseUuid, ensembleName: newComparisonEnsembleEnsembleName } =
            createCaseUuidAndEnsembleNameFromString(newCaseUuidAndEnsembleNameString);

        const comparisonEnsemble = newlySelectedRegularEnsembles.find(
            (elm) =>
                elm.caseUuid === newComparisonEnsembleCaseUuid && elm.ensembleName === newComparisonEnsembleEnsembleName
        );
        if (!comparisonEnsemble) {
            return;
        }

        setDeltaEnsembles((prev) =>
            prev.map((elm) => {
                if (elm.uuid === deltaEnsembleUuid) {
                    const newComparisonEnsemble: BaseEnsembleItem = {
                        caseUuid: comparisonEnsemble.caseUuid,
                        ensembleName: comparisonEnsemble.ensembleName,
                    };
                    return {
                        ...elm,
                        comparisonEnsemble: newComparisonEnsemble,
                    };
                }
                return elm;
            })
        );
    }

    function handleDeltaEnsembleReferenceEnsembleChange(
        deltaEnsembleUuid: string,
        newCaseUuidAndEnsembleNameString: string
    ) {
        const { caseUuid: newReferenceEnsembleCaseUuid, ensembleName: newReferenceEnsembleEnsembleName } =
            createCaseUuidAndEnsembleNameFromString(newCaseUuidAndEnsembleNameString);

        const referenceEnsemble = newlySelectedRegularEnsembles.find(
            (e) => e.caseUuid === newReferenceEnsembleCaseUuid && e.ensembleName === newReferenceEnsembleEnsembleName
        );
        if (!referenceEnsemble) {
            return;
        }

        setDeltaEnsembles((prev) =>
            prev.map((elm) => {
                if (elm.uuid === deltaEnsembleUuid) {
                    const newReferenceEnsemble: BaseEnsembleItem = {
                        caseUuid: referenceEnsemble.caseUuid,
                        ensembleName: referenceEnsemble.ensembleName,
                    };
                    return {
                        ...elm,
                        referenceEnsemble: newReferenceEnsemble,
                    };
                }
                return elm;
            })
        );
    }

    function handleAddDeltaEnsemble() {
        if (newlySelectedRegularEnsembles.length === 0) {
            return;
        }

        const comparisonEnsemble = newlySelectedRegularEnsembles[0];
        const referenceEnsemble =
            newlySelectedRegularEnsembles.length === 1
                ? newlySelectedRegularEnsembles[0]
                : newlySelectedRegularEnsembles[1];

        const newDeltaEnsemble: InternalDeltaEnsembleItem = {
            comparisonEnsemble: {
                caseUuid: comparisonEnsemble.caseUuid,
                ensembleName: comparisonEnsemble.ensembleName,
            },
            referenceEnsemble: {
                caseUuid: referenceEnsemble.caseUuid,
                ensembleName: referenceEnsemble.ensembleName,
            },
            uuid: v4(),
            color: tryToFindUnusedColor(),
            customName: null,
        };

        setDeltaEnsembles((prev) => [...prev, newDeltaEnsemble]);
    }

    function handleAddRegularEnsemble() {
        if (!checkIfRegularEnsembleAlreadySelected()) {
            const caseName = casesQuery.data?.find((c) => c.uuid === selectedCaseId)?.name ?? "UNKNOWN";
            const ensArr = [
                {
                    caseUuid: selectedCaseId,
                    caseName: caseName,
                    ensembleName: selectedRegularEnsembleName,
                    color: tryToFindUnusedColor(),
                    customName: null,
                },
            ];
            setNewlySelectedRegularEnsembles((prev) => [...prev, ...ensArr]);
        }
    }

    function handleRemoveDeltaEnsemble(uuid: string) {
        setDeltaEnsembles((prev) => [...prev.filter((e) => e.uuid !== uuid)]);
    }

    function handleRemoveRegularEnsemble(caseUuid: string, ensembleName: string) {
        setNewlySelectedRegularEnsembles((prev) => [
            ...prev.filter((e) => e.caseUuid !== caseUuid || e.ensembleName !== ensembleName),
        ]);

        // Validate delta ensembles
        const newDeltaEnsembles = [...deltaEnsembles];
        for (const elm of deltaEnsembles) {
            if (
                elm.comparisonEnsemble &&
                elm.comparisonEnsemble.caseUuid === caseUuid &&
                elm.comparisonEnsemble.ensembleName === ensembleName
            ) {
                elm.comparisonEnsemble = null;
            }
            if (
                elm.referenceEnsemble &&
                elm.referenceEnsemble.caseUuid === caseUuid &&
                elm.referenceEnsemble.ensembleName === ensembleName
            ) {
                elm.referenceEnsemble = null;
            }
        }
        setDeltaEnsembles(newDeltaEnsembles);
    }

    function handleClose() {
        setConfirmCancel(false);
        props.onClose();
    }

    function handleCancel() {
        if (isEqual(props.selectedRegularEnsembles, newlySelectedRegularEnsembles)) {
            handleClose();
            return;
        }
        setConfirmCancel(true);
    }

    function handleApplyEnsembleSelection() {
        if (deltaEnsembles.some((elm) => !elm.comparisonEnsemble || !elm.referenceEnsemble)) {
            return;
        }

        const validDeltaEnsembles: DeltaEnsembleItem[] = [];
        for (const deltaEnsemble of deltaEnsembles) {
            if (!deltaEnsemble.comparisonEnsemble || !deltaEnsemble.referenceEnsemble) {
                continue;
            }

            // Ensure no duplicate delta ensembles
            if (
                validDeltaEnsembles.some(
                    (elm) =>
                        isEqual(elm.comparisonEnsemble, deltaEnsemble.comparisonEnsemble) &&
                        isEqual(elm.referenceEnsemble, deltaEnsemble.referenceEnsemble)
                )
            ) {
                continue;
            }

            validDeltaEnsembles.push({
                comparisonEnsemble: deltaEnsemble.comparisonEnsemble,
                referenceEnsemble: deltaEnsemble.referenceEnsemble,
                color: deltaEnsemble.color,
                customName: deltaEnsemble.customName,
            });
        }

        setIsLoadingEnsembles(true);
        props
            .loadAndSetupEnsembles(newlySelectedRegularEnsembles, validDeltaEnsembles)
            .then(() => {
                handleClose();
            })
            .finally(() => {
                setIsLoadingEnsembles(false);
            });
    }

    function hasAnyDeltaEnsemblesChanged(): boolean {
        if (props.createdDeltaEnsembles.length !== deltaEnsembles.length) {
            return true;
        }

        const isContentEqual = props.createdDeltaEnsembles.every((elm, idx) => {
            const internalDeltaEnsemble = deltaEnsembles[idx];
            return (
                elm.color === internalDeltaEnsemble.color &&
                elm.customName === internalDeltaEnsemble.customName &&
                isEqual(elm.comparisonEnsemble, internalDeltaEnsemble.comparisonEnsemble) &&
                isEqual(elm.referenceEnsemble, internalDeltaEnsemble.referenceEnsemble)
            );
        });
        return !isContentEqual;
    }

    function areAnyDeltaEnsemblesInvalid(): boolean {
        return deltaEnsembles.some((elm) => !elm.comparisonEnsemble || !elm.referenceEnsemble);
    }

    function hasDuplicateDeltaEnsembles(): boolean {
        const uniqueDeltaEnsembles = new Set<string>();
        for (const elm of deltaEnsembles) {
            if (!elm.comparisonEnsemble || !elm.referenceEnsemble) {
                continue;
            }
            const key = `${elm.comparisonEnsemble.caseUuid}~&&~${elm.comparisonEnsemble.ensembleName}~&&~${elm.referenceEnsemble.caseUuid}~&&~${elm.referenceEnsemble.ensembleName}`;
            if (uniqueDeltaEnsembles.has(key)) {
                return true;
            }
            uniqueDeltaEnsembles.add(key);
        }
        return false;
    }

    function hasAnyRegularEnsembleChanged(): boolean {
        return !isEqual(props.selectedRegularEnsembles, newlySelectedRegularEnsembles);
    }

    function handleKeepCasesSwitchChange(e: React.ChangeEvent<HTMLInputElement>) {
        setCasesFilteringOptions((prev) => ({ ...prev, keep: e.target.checked }));
        storeStateInLocalStorage("showKeepCases", e.target.checked.toString());
    }

    function handleCasesByMeChange(e: React.ChangeEvent<HTMLInputElement>) {
        setCasesFilteringOptions((prev) => ({ ...prev, onlyMyCases: e.target.checked }));
        storeStateInLocalStorage("showOnlyMyCases", e.target.checked.toString());
    }

    function filterCases(cases: CaseInfo_api[] | undefined): CaseInfo_api[] | undefined {
        if (!cases) {
            return cases;
        }
        let filteredCases = cases;
        if (casesFilteringOptions.keep) {
            filteredCases = filteredCases.filter((c) => c.status === "keep");
        }
        if (casesFilteringOptions.onlyMyCases) {
            filteredCases = filteredCases.filter(
                (c) => c.user.toLowerCase() === userInfo?.username.replace("@equinor.com", "").toLowerCase()
            );
        } else if (casesFilteringOptions.users.length > 0) {
            filteredCases = filteredCases.filter((c) => casesFilteringOptions.users.includes(c.user));
        }
        return filteredCases;
    }

    function handleDeltaEnsembleColorChange(uuid: string, color: string) {
        setDeltaEnsembles((prev) =>
            prev.map((elm) => {
                if (elm.uuid === uuid) {
                    return { ...elm, color: color };
                }
                return elm;
            })
        );
    }

    function handleRegularEnsembleColorChange(caseUuid: string, ensembleName: string, color: string) {
        setNewlySelectedRegularEnsembles((prev) =>
            prev.map((elm) => {
                if (elm.caseUuid === caseUuid && elm.ensembleName === ensembleName) {
                    return { ...elm, color: color };
                }
                return elm;
            })
        );
    }

    function handleDeltaEnsembleCustomNameChange(uuid: string, customName: string) {
        setDeltaEnsembles((prev) =>
            prev.map((elm) => {
                if (elm.uuid === uuid) {
                    return { ...elm, customName: customName === "" ? null : customName };
                }
                return elm;
            })
        );
    }

    function handleRegularEnsembleCustomNameChange(caseUuid: string, ensembleName: string, customName: string) {
        setNewlySelectedRegularEnsembles((prev) => {
            return prev.map((e) => {
                if (e.caseUuid === caseUuid && e.ensembleName === ensembleName) {
                    return { ...e, customName: customName === "" ? null : customName };
                }
                return e;
            });
        });
    }

    const fieldOpts = fieldsQuery.data?.map((f) => ({ value: f.field_identifier, label: f.field_identifier })) ?? [];
    const caseOpts: TableSelectOption[] =
        filterCases(casesQuery.data)?.map((el) => ({
            id: el.uuid,
            values: [
                { label: el.name },
                { label: el.user, adornment: <UserAvatar key={el.uuid} userId={el.user} /> },
                { label: el.status },
            ],
        })) ?? [];
    const ensembleOpts =
        ensemblesQuery.data?.map((e) => ({ value: e.name, label: `${e.name}  (${e.realization_count} reals)` })) ?? [];

    const regularEnsembleAlreadySelected = checkIfRegularEnsembleAlreadySelected();

    function makeApplyButtonStartIcon() {
        if (isLoadingEnsembles) {
            return <CircularProgress size="small" />;
        }
        return <Check fontSize="small" />;
    }

    return (
        <>
            <Dialog
                open={true}
                onClose={handleCancel}
                title="Select ensembles"
                modal
                width={"75%"}
                minWidth={800}
                // minHeight={600}
                height={"75"}
                actions={
                    <div className="flex gap-4">
                        <Button
                            onClick={handleClose}
                            color="danger"
                            disabled={
                                isLoadingEnsembles ||
                                areAnyDeltaEnsemblesInvalid() ||
                                !(hasAnyRegularEnsembleChanged() || hasAnyDeltaEnsemblesChanged())
                            }
                        >
                            Discard changes
                        </Button>
                        <div title={hasDuplicateDeltaEnsembles() ? "Duplicate Delta Ensembles (blue rows)" : ""}>
                            <Button
                                onClick={handleApplyEnsembleSelection}
                                disabled={
                                    isLoadingEnsembles ||
                                    areAnyDeltaEnsemblesInvalid() ||
                                    hasDuplicateDeltaEnsembles() ||
                                    !(hasAnyRegularEnsembleChanged() || hasAnyDeltaEnsemblesChanged())
                                }
                                startIcon={makeApplyButtonStartIcon()}
                            >
                                {isLoadingEnsembles ? "Loading ensembles..." : "Apply"}
                            </Button>
                        </div>
                    </div>
                }
                showCloseCross
            >
                <div className="flex gap-4 max-w-full">
                    <div className="flex flex-col gap-4 p-4 border-r bg-slate-100 h-full">
                        <Label text="Field">
                            <QueryStateWrapper
                                queryResult={fieldsQuery}
                                errorComponent={<div className="text-red-500">Error loading fields</div>}
                                loadingComponent={<CircularProgress />}
                            >
                                <Dropdown
                                    options={fieldOpts}
                                    value={selectedField}
                                    onChange={handleFieldChanged}
                                    disabled={fieldOpts.length === 0}
                                />
                            </QueryStateWrapper>
                        </Label>
                        <Label text="Case">
                            <QueryStateWrapper
                                queryResult={casesQuery}
                                errorComponent={<div className="text-red-500">Error loading cases</div>}
                                loadingComponent={<CircularProgress />}
                            >
                                <div className="flex justify-end gap-4 items-center">
                                    <span className="flex-grow text-sm text-slate-500">
                                        Select from {caseOpts.length} cases
                                    </span>
                                    <Label position="right" text="Keep" title="Show only cases marked as keep">
                                        <Switch
                                            checked={casesFilteringOptions.keep}
                                            onChange={handleKeepCasesSwitchChange}
                                        />
                                    </Label>
                                    <Label position="right" text="My cases" title="Show only my cases">
                                        <Switch
                                            checked={casesFilteringOptions.onlyMyCases}
                                            onChange={handleCasesByMeChange}
                                        />
                                    </Label>
                                </div>
                                <TableSelect
                                    headerLabels={["Name", "Author", "Status"]}
                                    options={caseOpts}
                                    value={[selectedCaseId]}
                                    onChange={handleCaseChanged}
                                    disabled={caseOpts.length === 0}
                                    size={5}
                                    width={400}
                                    filter
                                    columnSizesInPercent={[60, 20, 20]}
                                />
                            </QueryStateWrapper>
                        </Label>
                        <Label text="Ensemble">
                            <QueryStateWrapper
                                queryResult={ensemblesQuery}
                                errorComponent={<div className="text-red-500">Error loading ensembles</div>}
                                loadingComponent={<CircularProgress />}
                            >
                                <Select
                                    options={ensembleOpts}
                                    value={[selectedRegularEnsembleName]}
                                    onChange={handleRegularEnsembleChanged}
                                    disabled={caseOpts.length === 0}
                                    size={5}
                                    width="100%"
                                />
                            </QueryStateWrapper>
                        </Label>
                        <div className="flex justify-end">
                            <Button
                                variant="contained"
                                onClick={handleAddRegularEnsemble}
                                color={regularEnsembleAlreadySelected ? "success" : "primary"}
                                disabled={regularEnsembleAlreadySelected || ensembleOpts.length === 0}
                                startIcon={
                                    regularEnsembleAlreadySelected ? (
                                        <Check fontSize="small" />
                                    ) : (
                                        <Add fontSize="small" />
                                    )
                                }
                            >
                                {regularEnsembleAlreadySelected ? "Ensemble already selected" : "Add Ensemble"}
                            </Button>
                        </div>
                    </div>
                    <div className="flex flex-col flex-grow max-h-full gap-4 p-4">
                        <div className="flex-1 flex-col">
                            <div className="flex-shrink">Selected Ensembles</div>
                            <div className="flex-1 overflow-auto">
                                <table className="w-full border border-collapse table-fixed text-sm">
                                    <thead className="sticky top-0">
                                        <tr>
                                            <th className="w-20 text-left p-2 bg-slate-300">Color</th>
                                            <th className="min-w-1/3 text-left p-2 bg-slate-300">Custom name</th>
                                            <th className="min-w-1/3 text-left p-2 bg-slate-300">Case</th>
                                            <th className="min-w-1/4 text-left p-2 bg-slate-300">Ensemble</th>
                                            <th className="w-20 text-left p-2 bg-slate-300">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {newlySelectedRegularEnsembles.map((item) => (
                                            <tr
                                                key={`${item.caseName}-${item.ensembleName}`}
                                                className="hover:bg-slate-100 odd:bg-slate-50 align-center"
                                            >
                                                <td className="p-2">
                                                    <ColorSelect
                                                        value={item.color}
                                                        onChange={(value) =>
                                                            handleRegularEnsembleColorChange(
                                                                item.caseUuid,
                                                                item.ensembleName,
                                                                value
                                                            )
                                                        }
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        placeholder="Give a custom name..."
                                                        defaultValue={item.customName ?? ""}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                            handleRegularEnsembleCustomNameChange(
                                                                item.caseUuid,
                                                                item.ensembleName,
                                                                e.target.value
                                                            )
                                                        }
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <div
                                                        className="text-ellipsis overflow-hidden whitespace-nowrap"
                                                        title={item.caseName}
                                                    >
                                                        {item.caseName}
                                                    </div>
                                                </td>
                                                <td className="p-2">
                                                    <div
                                                        className="text-ellipsis overflow-hidden whitespace-nowrap"
                                                        title={item.ensembleName}
                                                    >
                                                        {item.ensembleName}
                                                    </div>
                                                </td>
                                                <td className="p-2">
                                                    <IconButton
                                                        onClick={() =>
                                                            handleRemoveRegularEnsemble(
                                                                item.caseUuid,
                                                                item.ensembleName
                                                            )
                                                        }
                                                        color="danger"
                                                        title="Remove ensemble from selection"
                                                    >
                                                        <Remove fontSize="small" />
                                                    </IconButton>{" "}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {newlySelectedRegularEnsembles.length === 0 && (
                                <div className="text-gray-500">No ensembles selected.</div>
                            )}
                        </div>
                        <div className="flex-1 flex-col">
                            <div className="flex-shrink flex flex-row">
                                <Info
                                    fontSize="medium"
                                    titleAccess={`Create delta ensemble using selected ensembles:\n\n"Delta Ensemble" = "Comparison Ensemble" - "Reference Ensemble"`}
                                    className={
                                        "rounded-md px-0.25 py-0.25 border border-transparent text-white bg-indigo-600 hover:bg-indigo-700 cursor-help"
                                    }
                                />
                                <div className="pl-2 pr-2">Delta Ensembles</div>
                                <IconButton
                                    title="New delta ensemble"
                                    onClick={handleAddDeltaEnsemble}
                                    disabled={newlySelectedRegularEnsembles.length < 1}
                                >
                                    <Add />
                                </IconButton>
                            </div>
                            <div className="flex-1 overflow-auto">
                                <table className="w-full border border-collapse table-fixed text-sm">
                                    <thead>
                                        <tr>
                                            <th className="w-20 text-left p-2 bg-slate-300">Color</th>
                                            <th className="min-w-1/3 text-left p-2 bg-slate-300">Custom name</th>
                                            <th className="min-w-1/3 text-left p-2 bg-slate-300">
                                                Comparison Ensemble
                                            </th>
                                            <th className="min-w-1/4 text-left p-2 bg-slate-300">Reference Ensemble</th>
                                            <th className="w-20 text-left p-2 bg-slate-300">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="overflow-y-auto w-full">
                                        {deltaEnsembles.map((elm) => {
                                            const isDeltaEnsembleValid =
                                                elm.comparisonEnsemble !== null && elm.referenceEnsemble !== null;
                                            const isDuplicateDeltaEnsemble =
                                                deltaEnsembles.filter(
                                                    (e) =>
                                                        e.comparisonEnsemble?.caseUuid ===
                                                            elm.comparisonEnsemble?.caseUuid &&
                                                        e.comparisonEnsemble?.ensembleName ===
                                                            elm.comparisonEnsemble?.ensembleName &&
                                                        e.referenceEnsemble?.caseUuid ===
                                                            elm.referenceEnsemble?.caseUuid &&
                                                        e.referenceEnsemble?.ensembleName ===
                                                            elm.referenceEnsemble?.ensembleName
                                                ).length > 1;
                                            return (
                                                <tr
                                                    key={elm.uuid}
                                                    className={resolveClassNames(
                                                        "align-center ",

                                                        {
                                                            "hover:bg-red-50 odd:bg-red-200 even:bg-red-300":
                                                                !isDeltaEnsembleValid,
                                                            "hover:bg-blue-50 odd:bg-blue-200 even:bg-blue-300":
                                                                isDeltaEnsembleValid && isDuplicateDeltaEnsemble,
                                                            "hover:bg-slate-100 odd:bg-slate-50":
                                                                isDeltaEnsembleValid && !isDuplicateDeltaEnsemble,
                                                        }
                                                    )}
                                                >
                                                    <td className="p-2">
                                                        <ColorSelect
                                                            value={elm.color}
                                                            onChange={(value) =>
                                                                handleDeltaEnsembleColorChange(elm.uuid, value)
                                                            }
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input
                                                            placeholder="Give a custom name..."
                                                            defaultValue={elm.customName ?? ""}
                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                                handleDeltaEnsembleCustomNameChange(
                                                                    elm.uuid,
                                                                    e.target.value
                                                                )
                                                            }
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Dropdown
                                                            options={newlySelectedRegularEnsembles.map((elm) => {
                                                                return {
                                                                    value: createCaseUuidAndEnsembleNameString(
                                                                        elm.caseUuid,
                                                                        elm.ensembleName
                                                                    ),
                                                                    label:
                                                                        elm.customName ??
                                                                        `${elm.ensembleName} (${elm.caseName})`,
                                                                };
                                                            })}
                                                            value={
                                                                elm.comparisonEnsemble
                                                                    ? createCaseUuidAndEnsembleNameString(
                                                                          elm.comparisonEnsemble.caseUuid,
                                                                          elm.comparisonEnsemble.ensembleName
                                                                      )
                                                                    : undefined
                                                            }
                                                            onChange={(newCaseUuidAndEnsembleNameString) => {
                                                                handleDeltaEnsembleComparisonEnsembleChange(
                                                                    elm.uuid,
                                                                    newCaseUuidAndEnsembleNameString
                                                                );
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Dropdown
                                                            options={newlySelectedRegularEnsembles.map((elm) => {
                                                                return {
                                                                    value: createCaseUuidAndEnsembleNameString(
                                                                        elm.caseUuid,
                                                                        elm.ensembleName
                                                                    ),
                                                                    label:
                                                                        elm.customName ??
                                                                        `${elm.ensembleName} (${elm.caseName})`,
                                                                };
                                                            })}
                                                            value={
                                                                elm.referenceEnsemble
                                                                    ? createCaseUuidAndEnsembleNameString(
                                                                          elm.referenceEnsemble.caseUuid,
                                                                          elm.referenceEnsemble.ensembleName
                                                                      )
                                                                    : undefined
                                                            }
                                                            onChange={(value) => {
                                                                handleDeltaEnsembleReferenceEnsembleChange(
                                                                    elm.uuid,
                                                                    value
                                                                );
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <IconButton
                                                            onClick={() => handleRemoveDeltaEnsemble(elm.uuid)}
                                                            color="danger"
                                                            title="Remove delta ensemble from selection"
                                                        >
                                                            <Remove fontSize="small" />
                                                        </IconButton>{" "}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {deltaEnsembles.length === 0 && (
                                <div className="text-gray-500">No delta ensembles created.</div>
                            )}
                        </div>
                    </div>
                </div>
                {isLoadingEnsembles && <LoadingOverlay />}
            </Dialog>
            <Dialog
                open={confirmCancel}
                onClose={() => setConfirmCancel(false)}
                title="Unsaved changes"
                modal
                actions={
                    <div className="flex gap-4">
                        <Button onClick={() => setConfirmCancel(false)}>No, don&apos;t cancel</Button>
                        <Button onClick={handleClose} color="danger">
                            Yes, cancel
                        </Button>
                    </div>
                }
            >
                You have unsaved changes which will be lost. Are you sure you want to cancel?
            </Dialog>
        </>
    );
};

function createCaseUuidAndEnsembleNameString(caseUuid: string, ensembleName: string): string {
    return `${caseUuid}${CASE_UUID_ENSEMBLE_NAME_SEPARATOR}${ensembleName}`;
}

function createCaseUuidAndEnsembleNameFromString(caseUuidAndEnsembleNameString: string): {
    caseUuid: string;
    ensembleName: string;
} {
    const [caseUuid, ensembleName] = caseUuidAndEnsembleNameString.split(CASE_UUID_ENSEMBLE_NAME_SEPARATOR);
    if (!caseUuid || !ensembleName) {
        throw new Error("Invalid caseUuidAndEnsembleNameString");
    }

    return { caseUuid, ensembleName };
}
