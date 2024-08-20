import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { getTextWidthWithFont } from "@lib/utils/textSize";
import { Close, ExpandLess, ExpandMore } from "@mui/icons-material";

import { isEqual } from "lodash";
import { v4 } from "uuid";

import { BaseComponent, BaseComponentProps } from "../BaseComponent";
import { Input } from "../Input";
import { Virtualization } from "../Virtualization";

export type TableHeading = {
    [key: string]: {
        label: string;
        sortable?: boolean;
        sizeInPercent: number;
        formatValue?: (value: string | number | null) => string;
        formatStyle?: (value: string | number | null) => React.CSSProperties;
        subHeading?: TableHeading;
    };
};

export type TableRow<T extends TableHeading> = {
    [key in keyof T]: string | number | null;
};

type IdentifiedTableRow<T extends TableHeading> = {
    id: string;
    values: { [key in keyof T]: string | number | null };
};

export type TableProps<T extends TableHeading> = {
    headings: T;
    data: TableRow<T>[];
    width?: number | string;
    height?: number | string;
    onHover?: (row: TableRow<T> | null) => void;
    onClick?: (row: TableRow<T>) => void;
    highlightFilter?: (row: TableRow<T>) => boolean;
} & BaseComponentProps;

type LayoutError = {
    error: boolean;
    message: string;
};

enum SortDirection {
    ASC = "asc",
    DESC = "desc",
}

function filterData(
    data: IdentifiedTableRow<TableHeading>[],
    filterValues: { [key: string]: string },
    headings: TableHeading
): IdentifiedTableRow<TableHeading>[] {
    return data.filter((series) => {
        for (const col in filterValues) {
            const format = headings[col].formatValue || ((value: string | number) => value);
            const seriesValue = series.values[col];
            if (
                filterValues[col] !== "" &&
                (seriesValue === null ||
                    format(seriesValue).toString().toLowerCase().indexOf(filterValues[col].toLowerCase()) === -1)
            ) {
                return false;
            }
        }
        return true;
    });
}

type SortColumnAndDirectionElement = {
    col: string;
    dir: SortDirection;
};

function sortDataByColumns(
    data: IdentifiedTableRow<TableHeading>[],
    sortColumnAndDirectionArray: SortColumnAndDirectionElement[]
): IdentifiedTableRow<TableHeading>[] {
    return [...data.sort((a, b) => compareDataByColumns(a, b, sortColumnAndDirectionArray))];
}

function compareDataByColumns(
    a: IdentifiedTableRow<TableHeading>,
    b: IdentifiedTableRow<TableHeading>,
    sortColumnAndDirectionArray: SortColumnAndDirectionElement[]
): number {
    for (const { col, dir } of sortColumnAndDirectionArray) {
        const aValue = a.values[col];
        const bValue = b.values[col];
        if (aValue === null && bValue === null) {
            continue;
        }
        if (aValue === null) {
            return dir === SortDirection.ASC ? 1 : -1;
        }
        if (bValue === null) {
            return dir === SortDirection.ASC ? -1 : 1;
        }
        if (aValue < bValue) {
            return dir === SortDirection.ASC ? -1 : 1;
        }
        if (aValue > bValue) {
            return dir === SortDirection.ASC ? 1 : -1;
        }
    }
    return 0;
}

function preprocessData(data: TableRow<TableHeading>[]): IdentifiedTableRow<TableHeading>[] {
    return data.map((series) => {
        return {
            id: v4(),
            values: series,
        };
    });
}

type TableHeadingCellInformation = {
    id: string;
    colSpan: number;
    rowSpan: number;
    hasSubHeaders: boolean;
};

type TableHeadingInformation = {
    numColumns: number;
    dataColumnIds: string[];
    headerRows: TableHeadingCellInformation[][];
};

function recursivelyCalcDepth(headings: TableHeading, depth: number = 1): number {
    let maxDepth = depth;
    for (const col in headings) {
        const subHeading = headings[col].subHeading;
        if (subHeading) {
            const localDepth = recursivelyCalcDepth(subHeading, depth + 1);
            maxDepth = Math.max(maxDepth, localDepth);
        }
    }
    return maxDepth;
}

function extractInformationFromTableHeading(
    headings: TableHeading,
    depth: number = 0,
    headerRows: TableHeadingCellInformation[][] = []
): TableHeadingInformation {
    const maxDepth = recursivelyCalcDepth(headings);

    let numColumns = 0;
    if (!headerRows[depth]) {
        headerRows[depth] = [];
    }

    const dataColumnIds: string[] = [];

    for (const col in headings) {
        const subHeading = headings[col].subHeading;
        if (subHeading) {
            const subHeadingInfo = extractInformationFromTableHeading(subHeading, depth + 1, headerRows);
            headerRows[depth].push({
                id: col,
                hasSubHeaders: true,
                colSpan: subHeadingInfo.numColumns,
                rowSpan: 1,
            });
            numColumns += subHeadingInfo.numColumns;
            dataColumnIds.push(...subHeadingInfo.dataColumnIds);
        } else {
            numColumns++;
            headerRows[depth].push({
                id: col,
                hasSubHeaders: false,
                colSpan: 1,
                rowSpan: maxDepth - depth,
            });
            dataColumnIds.push(col);
        }
    }

    return {
        numColumns,
        dataColumnIds,
        headerRows,
    };
}

function flattenHeadings(
    headings: TableHeading,
    parentSizeInPercent: number = 100.0
): Omit<TableHeading, "subHeading"> {
    const newHeadings: Omit<TableHeading, "subHeading"> = {};
    for (const col in headings) {
        const subHeadings = headings[col].subHeading;
        if (subHeadings) {
            const flattenedSubHeadings = flattenHeadings(subHeadings, headings[col].sizeInPercent);
            for (const subCol in flattenedSubHeadings) {
                newHeadings[`${subCol}`] = {
                    ...flattenedSubHeadings[subCol],
                    sizeInPercent: (parentSizeInPercent * flattenedSubHeadings[subCol].sizeInPercent) / 100,
                };
            }
        }
        newHeadings[col] = {
            label: headings[col].label,
            sizeInPercent: (parentSizeInPercent * headings[col].sizeInPercent) / 100,
            formatValue: headings[col].formatValue,
            formatStyle: headings[col].formatStyle,
        };
    }
    return newHeadings;
}

function calcMaxColumnWidths<THeading extends TableHeading>(
    headings: THeading,
    data: TableRow<THeading>[]
): { [key: string]: number } {
    const columnWidths: { [key: string]: number } = {};
    for (const col in headings) {
        columnWidths[col] = getTextWidthWithFont(headings[col].label, "Equinor", 1.5);
    }
    for (const row of data) {
        for (const col in row) {
            const cellContent = row[col];
            const formatValue = headings[col]?.formatValue;
            const value = cellContent === null ? "" : formatValue ? formatValue(cellContent) : cellContent.toString();
            columnWidths[col] = Math.max(columnWidths[col], getTextWidthWithFont(value, "Equinor", 1.1));
        }
    }
    return columnWidths;
}

const HEADER_HEIGHT_PX = 30;
const ROW_HEIGHT_PX = 30;

export function Table(props: TableProps<TableHeading>): React.ReactNode {
    const [layoutError, setLayoutError] = React.useState<LayoutError>({ error: false, message: "" });
    const [preprocessedData, setPreprocessedData] = React.useState<IdentifiedTableRow<TableHeading>[]>([]);
    const [filteredData, setFilteredData] = React.useState<IdentifiedTableRow<TableHeading>[]>([]);
    const [filterValues, setFilterValues] = React.useState<{ [key: string]: string }>({});
    const [sortColumnAndDirectionArray, setSortColumnAndDirectionArray] = React.useState<
        SortColumnAndDirectionElement[]
    >([]);
    const [headerRows, setHeaderRows] = React.useState<TableHeadingCellInformation[][]>([]);
    const [prevFlattenedHeadings, setPrevFlattenedHeadings] = React.useState<Omit<TableHeading, "subHeading">>({});
    const [flattenedHeadings, setFlattenedHeadings] = React.useState<Omit<TableHeading, "subHeading">>({});
    const [dataColumnIds, setDataColumnIds] = React.useState<string[]>([]);
    const [columnWidths, setColumnWidths] = React.useState<{ [key: string]: number }>({});

    const [prevData, setPrevData] = React.useState<TableRow<TableHeading>[]>([]);
    const [prevHeadings, setPrevHeadings] = React.useState<TableHeading>({});

    const containerRef = React.useRef<HTMLDivElement>(null);

    if (!isEqual(prevData, props.data)) {
        setPrevData(props.data);
        const newPreprocessedData = preprocessData(props.data);
        setPreprocessedData(newPreprocessedData);
        setFilteredData(
            sortDataByColumns(
                filterData(newPreprocessedData, filterValues, flattenedHeadings),
                sortColumnAndDirectionArray
            )
        );
    }

    if (!isEqual(prevHeadings, props.headings) || !isEqual(prevData, props.data)) {
        setPrevHeadings(props.headings);
        const info = extractInformationFromTableHeading(props.headings);
        setHeaderRows(info.headerRows);
        setDataColumnIds(info.dataColumnIds);
        for (const row of props.data) {
            if (Object.keys(row).length !== info.numColumns) {
                setLayoutError({
                    error: true,
                    message: "The number of headings does not match the number of data series.",
                });
                break;
            }
            if (Object.keys(row).some((col) => !info.dataColumnIds.includes(col))) {
                setLayoutError({
                    error: true,
                    message: "The data series column ids do not match the heading ids.",
                });
                break;
            }
        }
        const newFlattenedHeadings = flattenHeadings(props.headings);
        setFlattenedHeadings(newFlattenedHeadings);
    }

    if (!isEqual(prevData, props.data) || !isEqual(prevFlattenedHeadings, flattenedHeadings)) {
        setColumnWidths(calcMaxColumnWidths(flattenedHeadings, props.data));
    }

    if (!isEqual(prevFlattenedHeadings, flattenedHeadings)) {
        setPrevFlattenedHeadings(flattenedHeadings);
    }

    function handlePointerOver(row: TableRow<any> | null) {
        if (props.onHover) {
            props.onHover(row);
        }
    }

    function handlePointerDown(row: TableRow<any>) {
        if (props.onClick) {
            props.onClick(row);
        }
    }

    function handleFilterChange(col: string, value: string) {
        const newFilterValues = { ...filterValues, [col]: value };
        setFilterValues(newFilterValues);
        setFilteredData(
            sortDataByColumns(
                filterData(preprocessedData, newFilterValues, flattenedHeadings),
                sortColumnAndDirectionArray
            )
        );
    }

    function handleSortDirectionChange(event: React.MouseEvent<HTMLDivElement>, col: string, dir: SortDirection) {
        const sortColumnAndDirectionElement: SortColumnAndDirectionElement = {
            col,
            dir,
        };

        let newSortColumnAndDirectionArray: SortColumnAndDirectionElement[] = [];

        if (event.shiftKey) {
            const element = sortColumnAndDirectionArray.find((el) => el.col === col);
            if (element && element.dir === dir) {
                newSortColumnAndDirectionArray = sortColumnAndDirectionArray.filter((el) => el.col !== col);
            } else if (element) {
                newSortColumnAndDirectionArray = sortColumnAndDirectionArray.filter((el) => el.col !== col);
                newSortColumnAndDirectionArray = [...newSortColumnAndDirectionArray, sortColumnAndDirectionElement];
            } else {
                newSortColumnAndDirectionArray = [...sortColumnAndDirectionArray, sortColumnAndDirectionElement];
            }
        } else {
            newSortColumnAndDirectionArray = [sortColumnAndDirectionElement];
        }

        setSortColumnAndDirectionArray(newSortColumnAndDirectionArray);
        sortDataByColumns(filteredData, newSortColumnAndDirectionArray);
    }

    if (layoutError.error) {
        return <div>{layoutError.message}</div>;
    }

    function makeSortButtons(col: string): React.ReactNode {
        let sortDirection: SortDirection | null = null;
        let numSortColumn = 0;
        if (sortColumnAndDirectionArray.length > 0) {
            const index = sortColumnAndDirectionArray.findIndex((el) => el.col === col);
            if (index !== -1) {
                numSortColumn = index + 1;
                sortDirection = sortColumnAndDirectionArray[index].dir;
            }
        }

        const component = (
            <div className="flex flex-col h-full">
                <div
                    className={resolveClassNames(
                        "text-sm hover:text-blue-500 cursor-pointer h-1/2 flex flex-col justify-center",
                        sortDirection === SortDirection.ASC
                            ? "text-white bg-blue-800 hover:text-blue-100"
                            : "text-blue-300 hover:text-white hover:bg-blue-300"
                    )}
                    onClick={(e) => handleSortDirectionChange(e, col, SortDirection.ASC)}
                    title="Sort ascending"
                >
                    <div className=" flex flex-col justify-center">
                        <ExpandLess fontSize="inherit" />
                    </div>
                </div>
                <div
                    className={resolveClassNames(
                        "text-sm hover:text-blue-500 cursor-pointer h-1/2 flex flex-col justify-center",
                        sortDirection === SortDirection.DESC
                            ? "text-white bg-blue-800 hover:text-blue-100"
                            : "text-blue-300 hover:text-white hover:bg-blue-300"
                    )}
                    onClick={(e) => handleSortDirectionChange(e, col, SortDirection.DESC)}
                    title="Sort descending"
                >
                    <div className=" flex flex-col justify-center">
                        <ExpandMore fontSize="inherit" />
                    </div>
                </div>
            </div>
        );

        if (sortColumnAndDirectionArray.length <= 1 || numSortColumn === 0) {
            return component;
        }

        return (
            <div className="flex gap-1 items-center">
                <div className="rounded-full bg-blue-800 text-white h-4 w-4 flex items-center justify-center text-xs pt-0.5">
                    {numSortColumn}
                </div>
                {component}
            </div>
        );
    }

    function makeHeadingRow(row: TableHeadingCellInformation[], depth: number): React.ReactNode {
        const headingCells: React.ReactNode[] = [];

        for (const cell of row) {
            headingCells.push(
                <th
                    key={cell.id}
                    className={resolveClassNames("bg-slate-100 p-0 pb-1 text-left drop-shadow", {
                        "text-center": cell.hasSubHeaders,
                    })}
                    style={{
                        width: `${flattenedHeadings[cell.id].sizeInPercent}%`,
                        minWidth: cell.hasSubHeaders ? undefined : columnWidths[cell.id],
                        height: HEADER_HEIGHT_PX * (cell.rowSpan + (!cell.hasSubHeaders ? 1 : 0)),
                    }}
                    scope="col"
                    rowSpan={cell.rowSpan}
                    colSpan={cell.colSpan}
                >
                    <div className="h-full flex flex-col">
                        <div className="px-1 flex items-center gap-1 flex-grow">
                            <span className="flex-grow pt-1">{flattenedHeadings[cell.id].label}</span>
                            {!cell.hasSubHeaders ? makeSortButtons(cell.id) : null}
                        </div>
                        {!cell.hasSubHeaders && (
                            <div className="p-0 text-sm flex flex-col justify-end">
                                <Input
                                    type="text"
                                    value={filterValues[cell.id] || ""}
                                    placeholder="Filter ..."
                                    onChange={(e) => handleFilterChange(cell.id, e.target.value)}
                                    endAdornment={
                                        <div
                                            className="cursor-pointer text-gray-600 hover:text-gray-500 text-sm"
                                            onClick={() => handleFilterChange(cell.id, "")}
                                        >
                                            <Close fontSize="inherit" />
                                        </div>
                                    }
                                    wrapperStyle={{
                                        fontWeight: "normal",
                                        fontSize: "0.5rem",
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </th>
            );
        }

        return <tr key={depth}>{headingCells}</tr>;
    }

    function makeHeadings(): React.ReactNode {
        const headingComponents: React.ReactNode[] = [];
        for (let depth = 0; depth < headerRows.length; depth++) {
            headingComponents.push(makeHeadingRow(headerRows[depth], depth));
        }
        return <>{headingComponents}</>;
    }

    return (
        <BaseComponent disabled={props.disabled}>
            <div
                ref={containerRef}
                className="relative overflow-auto"
                style={{ width: props.width, height: props.height }}
            >
                <table className="w-full max-h-full border-0 border-separate border-spacing-0 text-sm">
                    <thead className="border-0 m-0 p-0 sticky top-0">{makeHeadings()}</thead>
                    <tbody style={{ width: props.width, maxHeight: props.height }}>
                        <Virtualization
                            containerRef={containerRef}
                            direction="vertical"
                            placeholderComponent="tr"
                            items={filteredData}
                            itemSize={ROW_HEIGHT_PX}
                            renderItem={(item: IdentifiedTableRow<any>) => {
                                return (
                                    <tr
                                        key={item.id}
                                        className={`${
                                            props.highlightFilter && props.highlightFilter(item.values)
                                                ? "bg-blue-100 "
                                                : ""
                                        } hover:bg-blue-50`}
                                        onPointerOver={() => handlePointerOver(item.values)}
                                        onPointerLeave={() => handlePointerOver(null)}
                                        onPointerDown={() => handlePointerDown(item.values)}
                                        style={{ height: 30, maxHeight: ROW_HEIGHT_PX }}
                                    >
                                        {dataColumnIds.map((col) => {
                                            if (item.values[col] === undefined) {
                                                return null;
                                            }
                                            const format = flattenedHeadings[col].formatValue;
                                            const formatStyle = flattenedHeadings[col].formatStyle;
                                            return (
                                                <td
                                                    key={`${item.id}-${col}`}
                                                    className="border p-1 whitespace-nowrap"
                                                    style={formatStyle ? formatStyle(item.values[col]) : undefined}
                                                >
                                                    {format ? format(item.values[col]) : item.values[col]}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            }}
                        />
                    </tbody>
                </table>
            </div>
        </BaseComponent>
    );
}

Table.displayName = "Table";
