import React from "react";

import { isEqual, orderBy } from "lodash";

import type { CaseInfo_api } from "@api";
import { useAuthProvider } from "@framework/internal/providers/AuthProvider";
import { Table } from "@lib/newComponents/Table";
import { SortDirection, type TableSortState } from "@lib/newComponents/Table/typesAndEnums";
import { Virtualization } from "@lib/newComponents/Virtualization";
import { formatDate } from "@lib/utils/dates";

import { AuthorCell, CaseNameAndIdCell, DescriptionCell } from "./_components";
import type { CaseTableFilterState } from "./CaseTableFilterRow";
import { CaseTableFilterRow, useCaseDataFilter } from "./CaseTableFilterRow";

export type CaseTableProps = {
    selectedCase?: string | null;

    caseData: CaseInfo_api[] | undefined;

    disabledColumnFilters?: string[];
    showOnlyMyCases?: boolean;
    showOnlyOfficialCases?: boolean;

    onCaseSelected?: (selectedCase: string) => void;
    onDataCollated?: (collatedData: CaseInfo_api[]) => void;
};

export function CaseTable(props: CaseTableProps): React.ReactNode {
    const { onDataCollated } = props;
    const tableOverflowWrapperRef = React.useRef<HTMLDivElement>(null);

    const { userInfo } = useAuthProvider();
    const userName = React.useMemo(() => {
        return userInfo?.username.replace("@equinor.com", "").toLowerCase() ?? "";
    }, [userInfo]);

    const [tableSortState, setTableSortState] = React.useState<TableSortState>({ updatedAtUtcMs: SortDirection.DESC });
    const [tableFilterState, setTableFilterState] = React.useState<CaseTableFilterState>({});

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

    // TODO: Support multiple sort state
    const filteredCaseData = useCaseDataFilter(props.caseData, tableFilterState);
    const collatedCaseData = React.useMemo(
        function sortCaseData() {
            if (!filteredCaseData) return [];

            const sortKey = Object.keys(tableSortState)[0] as keyof CaseInfo_api | undefined;
            const sortDirection = sortKey ? tableSortState[sortKey] : undefined;

            if (!sortKey || !sortDirection) return filteredCaseData;

            if (sortDirection === SortDirection.NONE) {
                // Sort cases by date descending (to prevent random order when no sorting is applied in the table)
                return orderBy(filteredCaseData, "updatedAtUtcMs", SortDirection.ASC);
            }

            return orderBy(filteredCaseData, sortKey, sortDirection);
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
            sortable
            selectable
            currentSort={tableSortState}
            onChangeSortDirection={(col, dir) => setTableSortState({ [col]: dir })}
            selectedRow={props.selectedCase}
            onRowSelect={props.onCaseSelected}
        >
            <Table.Head sticky>
                <Table.Column colKey="name" widthInPercent={24}>
                    Name / id
                </Table.Column>
                <Table.Column colKey="description" widthInPercent={18}>
                    Description
                </Table.Column>
                <Table.Column colKey="author" widthInPercent={12}>
                    Author {userName}
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

            <Table.Body>
                <Virtualization
                    direction="vertical"
                    containerRef={tableOverflowWrapperRef}
                    items={collatedCaseData}
                    itemSize={37}
                    renderItem={(caseRow: CaseInfo_api) => (
                        <Table.Row key={caseRow.uuid} rowKey={caseRow.uuid}>
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
                    )}
                />
            </Table.Body>
        </Table.Root>
    );
}

function formatNullableText(value: string | null): string {
    return value ?? "";
}
