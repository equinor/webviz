import React from "react";

import { isEqual, orderBy } from "lodash";

import type { CaseInfo_api } from "@api";
import type { UserEnsembleSetting } from "@framework/internal/EnsembleSetLoader";
import { useAuthProvider } from "@framework/internal/providers/AuthProvider";
import { HasChangesIndicator } from "@lib/components/HasChangesIndicator";
import { Table } from "@lib/components/Table";
import { TableCompositions } from "@lib/components/Table/compositions";
import { ROW_HEIGHT_PX } from "@lib/components/Table/constants";
import { SortDirection, type TableSortState } from "@lib/components/Table/typesAndEnums";
import { Tooltip } from "@lib/components/Tooltip";
import { Virtualization } from "@lib/components/Virtualization";
import { formatDate } from "@lib/utils/dates";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { AuthorCell, CaseNameAndIdCell, DescriptionCell } from "./_components";
import type { CaseTableFilterState } from "./CaseTableFilterRow";
import { CaseTableFilterRow, useCaseDataFilter } from "./CaseTableFilterRow";

export type CaseTableProps = {
    isPending?: boolean;
    selectedCase?: string | null;

    ensembleSelection: UserEnsembleSetting[];
    newEnsembleSelection: UserEnsembleSetting[];

    caseData: CaseInfo_api[] | undefined;

    disabledColumnFilters?: string[];
    showOnlyMyCases?: boolean;
    showOnlyOfficialCases?: boolean;

    onCaseSelected?: (selectedCase: string | null) => void;
    onDataCollated?: (collatedData: CaseInfo_api[]) => void;
};

// colKey doesn't always match the data field name on CaseInfo_api
const COL_KEY_TO_FIELD: Record<string, string> = { author: "user", "#": "numSelectedEnsembles" };

type EnsembleCounts = {
    numSelectedEnsembles: number;
    numRemovedEnsembles: number;
    numAddedEnsembles: number;
    hasChanges: boolean;
};
type CaseDataWithEnsembleCount = CaseInfo_api & EnsembleCounts;

export function CaseTable(props: CaseTableProps): React.ReactNode {
    const { onDataCollated } = props;
    const tableOverflowWrapperRef = React.useRef<HTMLDivElement>(null);

    const { userInfo } = useAuthProvider();
    const userName = React.useMemo(() => {
        return userInfo?.username.replace("@equinor.com", "").toLowerCase() ?? "";
    }, [userInfo]);

    const [tableFilterState, setTableFilterState] = React.useState<CaseTableFilterState>({});
    const [tableSortState, setTableSortState] = React.useState<TableSortState[] | undefined>([
        {
            columnKey: "updatedAtUtcMs",
            direction: SortDirection.DESC,
        },
    ]);

    const [prevShowOnlyMyCases, setPrevShowOnlyMyCases] = React.useState(props.showOnlyMyCases);
    const [prevShowOnlyOfficialCases, setPrevShowOnlyOfficialCases] = React.useState(props.showOnlyOfficialCases);

    if (!isEqual(props.showOnlyOfficialCases, prevShowOnlyOfficialCases)) {
        setPrevShowOnlyOfficialCases(props.showOnlyOfficialCases);

        setTableFilterState((prev) => ({
            ...prev,
            status: props.showOnlyOfficialCases ? ["official"] : [],
        }));
    }

    if (!isEqual(props.showOnlyMyCases, prevShowOnlyMyCases)) {
        setPrevShowOnlyMyCases(props.showOnlyMyCases);

        setTableFilterState((prev) => ({
            ...prev,
            author: props.showOnlyMyCases ? userName : "",
        }));
    }

    const caseDataWithSelectionCount = React.useMemo<CaseDataWithEnsembleCount[]>(() => {
        if (!props.caseData) return [];

        const numSelectionsByCase = new Map<string, EnsembleCounts>();

        for (const ensemble of props.newEnsembleSelection) {
            const caseId = ensemble.ensembleIdent.getCaseUuid();
            const currentCount = numSelectionsByCase.get(caseId) ?? {
                numSelectedEnsembles: 0,
                numRemovedEnsembles: 0,
                numAddedEnsembles: 0,
                hasChanges: false,
            };
            const newSelectedEnsembles = currentCount.numSelectedEnsembles + 1;
            let newAddedEnsembles = currentCount.numAddedEnsembles;
            if (!props.ensembleSelection.some((e) => e.ensembleIdent.equals(ensemble.ensembleIdent))) {
                newAddedEnsembles += 1;
            }
            numSelectionsByCase.set(caseId, {
                ...currentCount,
                numSelectedEnsembles: newSelectedEnsembles,
                numAddedEnsembles: newAddedEnsembles,
                hasChanges: currentCount.hasChanges || newAddedEnsembles > 0,
            });
        }

        for (const ensemble of props.ensembleSelection) {
            const caseId = ensemble.ensembleIdent.getCaseUuid();
            const currentCount = numSelectionsByCase.get(caseId) ?? {
                numSelectedEnsembles: 0,
                numRemovedEnsembles: 0,
                numAddedEnsembles: 0,
                hasChanges: false,
            };
            let newRemovedEnsembles = currentCount.numRemovedEnsembles;
            if (!props.newEnsembleSelection.some((e) => e.ensembleIdent.equals(ensemble.ensembleIdent))) {
                newRemovedEnsembles += 1;
            }
            numSelectionsByCase.set(caseId, {
                ...currentCount,
                numRemovedEnsembles: newRemovedEnsembles,
                hasChanges: currentCount.hasChanges || newRemovedEnsembles > 0,
            });
        }

        return props.caseData?.map((caseRow) => {
            const counts = numSelectionsByCase.get(caseRow.uuid);
            return {
                ...caseRow,
                numSelectedEnsembles: counts?.numSelectedEnsembles ?? 0,
                numRemovedEnsembles: counts?.numRemovedEnsembles ?? 0,
                numAddedEnsembles: counts?.numAddedEnsembles ?? 0,
                hasChanges: counts?.hasChanges ?? false,
            };
        });
    }, [props.caseData, props.ensembleSelection, props.newEnsembleSelection]);

    const filteredCaseData = useCaseDataFilter(caseDataWithSelectionCount, tableFilterState);
    const collatedCaseData = React.useMemo(
        function sortCaseData() {
            if (!filteredCaseData) return [];

            const activeSorts = (tableSortState ?? []).filter((s) => s.direction !== SortDirection.NONE);

            if (activeSorts.length === 0) {
                // Sort cases by date descending (to prevent random order when no sorting is applied in the table)
                return orderBy(filteredCaseData, "updatedAtUtcMs", SortDirection.DESC);
            }

            const sortFields: string[] = [];
            const sortDirections: ("asc" | "desc")[] = [];
            for (const s of activeSorts) {
                const field = COL_KEY_TO_FIELD[s.columnKey] ?? s.columnKey;
                const dir = s.direction as "asc" | "desc";
                if (field === "numSelectedEnsembles") {
                    sortFields.push("hasChanges", field);
                    sortDirections.push(dir, dir);
                } else {
                    sortFields.push(field);
                    sortDirections.push(dir);
                }
            }
            return orderBy(filteredCaseData, sortFields, sortDirections);
        },
        [filteredCaseData, tableSortState],
    );

    // Emit collation changes
    React.useEffect(() => onDataCollated?.(collatedCaseData), [collatedCaseData, onDataCollated]);

    return (
        <Table.Root
            overflowWrapperRef={tableOverflowWrapperRef}
            height={"100%"}
            size="small"
            compact
            fixed
            sortable="multiple"
            selectable
            columnSorting={tableSortState}
            rowSelection={props.selectedCase}
            onChangeColumnSort={setTableSortState}
            onChangeRowSelection={props.onCaseSelected}
        >
            <Table.Head sticky>
                {/* Tweak alignment so sorting-arrow show up in the middle */}
                <Table.Column colKey="#" width={42} layoutClassName="text-center! pr-0!" />
                <Table.Column colKey="name" widthInPercent={24}>
                    Case (ID)
                </Table.Column>
                <Table.Column colKey="description" widthInPercent={18}>
                    Description
                </Table.Column>
                <Table.Column colKey="author" widthInPercent={12}>
                    Author
                </Table.Column>
                <Table.Column colKey="status" widthInPercent={8}>
                    Status
                </Table.Column>
                <Table.Column colKey="updatedAtUtcMs" widthInPercent={18}>
                    Date
                </Table.Column>
                <Table.Column colKey="modelName" widthInPercent={11}>
                    Model
                </Table.Column>
                <Table.Column colKey="modelRevision" widthInPercent={9}>
                    Revision
                </Table.Column>

                <CaseTableFilterRow
                    caseData={props.caseData}
                    filterState={tableFilterState}
                    onFilterStateChange={(k, v) => {
                        setTableFilterState((prev) => ({
                            ...prev,
                            [k]: v,
                        }));
                    }}
                />
            </Table.Head>

            <Table.Body emptyMessage="No cases found">
                {props.isPending && <TableCompositions.PendingRows rowCount="fill" />}
                <Virtualization
                    placeholderComponent="tr"
                    direction="vertical"
                    containerRef={tableOverflowWrapperRef}
                    items={collatedCaseData}
                    itemSize={ROW_HEIGHT_PX["small"]}
                    renderItem={(caseRow: CaseDataWithEnsembleCount) => {
                        return (
                            <Table.Row key={caseRow.uuid} rowKey={caseRow.uuid}>
                                <Table.Cell layoutClassName="text-center! px-xs">
                                    <Tooltip
                                        content={`${caseRow.numSelectedEnsembles} ensemble(s) selected in this case`}
                                    >
                                        <div
                                            className={resolveClassNames(
                                                "px-3xs py-4xs bg-canvas text-body-xs text-neutral-strong relative cursor-help rounded text-center",
                                                {
                                                    "bg-accent!": caseRow.numSelectedEnsembles > 0,
                                                },
                                            )}
                                        >
                                            {caseRow.numSelectedEnsembles}/{caseRow.ensembles.length}
                                            {caseRow.hasChanges && (
                                                <div className="z-elevated absolute top-0 right-0 translate-x-1/2 -translate-y-1/2">
                                                    <HasChangesIndicator
                                                        size="em"
                                                        tooltip={`${caseRow.numAddedEnsembles} ensemble(s) will be added, ${caseRow.numRemovedEnsembles} ensemble(s) will be removed`}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </Tooltip>
                                </Table.Cell>
                                <Table.Cell>
                                    <CaseNameAndIdCell
                                        cellRowSelected={props.selectedCase === caseRow.uuid}
                                        caseName={caseRow.name}
                                        caseId={caseRow.uuid}
                                    />
                                </Table.Cell>
                                <Table.Cell>
                                    <DescriptionCell description={caseRow.description} />
                                </Table.Cell>
                                <Table.Cell>
                                    <AuthorCell author={caseRow.user} />
                                </Table.Cell>
                                <Table.Cell>{caseRow.status}</Table.Cell>
                                <Table.Cell>{formatDate(caseRow.updatedAtUtcMs)}</Table.Cell>
                                <Table.Cell>{formatNullableText(caseRow.modelName)}</Table.Cell>
                                <Table.Cell>{formatNullableText(caseRow.modelRevision)}</Table.Cell>
                            </Table.Row>
                        );
                    }}
                />
            </Table.Body>
        </Table.Root>
    );
}

function formatNullableText(value: string | null): string {
    return value ?? "";
}
