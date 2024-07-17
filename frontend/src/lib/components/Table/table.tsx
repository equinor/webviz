import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Close, ExpandLess, ExpandMore } from "@mui/icons-material";

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
    onHover?: (row: TableRow<T>) => void;
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

export const Table: React.FC<TableProps<TableHeading>> = (props) => {
    const [layoutError, setLayoutError] = React.useState<LayoutError>({ error: false, message: "" });
    const [preprocessedData, setPreprocessedData] = React.useState<IdentifiedTableRow<TableHeading>[]>([]);
    const [filteredData, setFilteredData] = React.useState<IdentifiedTableRow<TableHeading>[]>([]);
    const [filterValues, setFilterValues] = React.useState<{ [key: string]: string }>({});
    const [sortColumnAndDirectionArray, setSortColumnAndDirectionArray] = React.useState<
        SortColumnAndDirectionElement[]
    >([]);

    const [prevData, setPrevData] = React.useState<TableRow<TableHeading>[]>([]);

    const containerRef = React.useRef<HTMLDivElement>(null);

    if (prevData !== props.data) {
        setPrevData(props.data);
        const newPreprocessedData = preprocessData(props.data);
        setPreprocessedData(newPreprocessedData);
        setFilteredData(
            sortDataByColumns(
                filterData(newPreprocessedData, filterValues, props.headings),
                sortColumnAndDirectionArray
            )
        );
    }

    React.useEffect(() => {
        const maxNumberOfSubheadings = Object.keys(props.headings).length;
        for (const row of props.data) {
            if (Object.keys(row).length !== maxNumberOfSubheadings) {
                setLayoutError({
                    error: true,
                    message: "The number of headings does not match the number of data series.",
                });
                break;
            }
        }
    }, [props.headings, props.data]);

    function handlePointerOver(row: TableRow<any>) {
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
        setFilterValues({ ...filterValues, [col]: value });
        setFilteredData(
            sortDataByColumns(filterData(preprocessedData, filterValues, props.headings), sortColumnAndDirectionArray)
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
            <div className="flex flex-col h-8">
                <div
                    className={resolveClassNames(
                        "text-sm hover:text-blue-500 cursor-pointer h-4",
                        sortDirection === SortDirection.ASC
                            ? "text-white bg-blue-800 hover:text-blue-100"
                            : "text-blue-300 hover:text-white hover:bg-blue-300"
                    )}
                    onClick={(e) => handleSortDirectionChange(e, col, SortDirection.ASC)}
                    title="Sort ascending"
                >
                    <div className="-mt-0.5">
                        <ExpandLess fontSize="inherit" />
                    </div>
                </div>
                <div
                    className={resolveClassNames(
                        "text-sm hover:text-blue-500 cursor-pointer h-4",
                        sortDirection === SortDirection.DESC
                            ? "text-white bg-blue-800 hover:text-blue-100"
                            : "text-blue-300 hover:text-white hover:bg-blue-300"
                    )}
                    onClick={(e) => handleSortDirectionChange(e, col, SortDirection.DESC)}
                    title="Sort descending"
                >
                    <div className="-mt-1">
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

    return (
        <BaseComponent disabled={props.disabled}>
            <div
                ref={containerRef}
                className="relative overflow-auto"
                style={{ width: props.width, maxHeight: props.height }}
            >
                <table className="w-full h-full border-0 border-separate border-spacing-0 text-sm">
                    <thead className="border-0 m-0 p-0 sticky">
                        <tr className="p-0 border-0">
                            {Object.keys(props.headings).map((col) => (
                                <th
                                    key={col}
                                    className="bg-slate-100 p-0 pb-1 text-left drop-shadow sticky top-0"
                                    style={{ width: `${props.headings[col].sizeInPercent}%` }}
                                    scope="col"
                                >
                                    <div className="px-1 flex items-center">
                                        <span className="flex-grow">{props.headings[col].label}</span>
                                        {makeSortButtons(col)}
                                    </div>
                                    <div className="p-0 text-sm">
                                        <Input
                                            type="text"
                                            value={filterValues[col] || ""}
                                            placeholder={`Filter ${props.headings[col].label}...`}
                                            onChange={(e) => handleFilterChange(col, e.target.value)}
                                            endAdornment={
                                                <div
                                                    className="cursor-pointer text-gray-600 hover:text-gray-500 text-sm"
                                                    onClick={() => handleFilterChange(col, "")}
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
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody style={{ width: props.width, maxHeight: props.height }}>
                        <Virtualization
                            containerRef={containerRef}
                            direction="vertical"
                            placeholderComponent="tr"
                            items={filteredData}
                            itemSize={30}
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
                                        onPointerDown={() => handlePointerDown(item.values)}
                                        style={{ height: 30 }}
                                    >
                                        {Object.keys(props.headings).map((col) => {
                                            if (item.values[col] === undefined) {
                                                return null;
                                            }
                                            const format = props.headings[col].formatValue;
                                            const formatStyle = props.headings[col].formatStyle;
                                            return (
                                                <td
                                                    key={`${item.id}-${col}`}
                                                    className="border p-1"
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
};

Table.displayName = "Table";
