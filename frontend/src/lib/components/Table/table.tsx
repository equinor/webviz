import React from "react";

import { ChevronDownIcon, ChevronUpIcon, XMarkIcon } from "@heroicons/react/20/solid";

import { v4 } from "uuid";

import { BaseComponent, BaseComponentProps } from "../BaseComponent";
import { IconButton } from "../IconButton";
import { Input } from "../Input";
import { Virtualization } from "../Virtualization";

export type TableHeading = {
    [key: string]: {
        label: string;
        sortable?: boolean;
        sizeInPercent: number;
        format?: (value: string | number) => string | number;
    };
};

type TableRow<T extends TableHeading> = {
    [key in keyof T]: string | number;
};

type IdentifiedTableRow<T extends TableHeading> = {
    id: string;
    values: { [key in keyof T]: string | number };
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
    Asc = "asc",
    Desc = "desc",
}

function filterData(
    data: IdentifiedTableRow<TableHeading>[],
    filterValues: { [key: string]: string },
    headings: TableHeading
): IdentifiedTableRow<TableHeading>[] {
    return data.filter((series) => {
        for (const col in filterValues) {
            const format = headings[col].format || ((value: string | number) => value);
            if (
                filterValues[col] !== "" &&
                format(series.values[col]).toString().toLowerCase().indexOf(filterValues[col].toLowerCase()) === -1
            ) {
                return false;
            }
        }
        return true;
    });
}

function sortData(
    data: IdentifiedTableRow<TableHeading>[],
    col: string,
    dir: SortDirection
): IdentifiedTableRow<TableHeading>[] {
    return [
        ...data.sort((a, b) => {
            if (a.values[col] < b.values[col]) {
                return dir === SortDirection.Asc ? -1 : 1;
            }
            if (a.values[col] > b.values[col]) {
                return dir === SortDirection.Asc ? 1 : -1;
            }
            return 0;
        }),
    ];
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
    const [sortColumnAndDirection, setSortColumnAndDirection] = React.useState<{ col: string; dir: SortDirection }>({
        col: "",
        dir: SortDirection.Asc,
    });
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        setPreprocessedData(preprocessData(props.data));
    }, [props.data]);

    React.useEffect(() => {
        setFilteredData(filterData(preprocessedData, filterValues, props.headings));
    }, [preprocessedData, filterValues]);

    React.useEffect(() => {
        setFilteredData((prev) => sortData(prev, sortColumnAndDirection.col, sortColumnAndDirection.dir));
    }, [sortColumnAndDirection]);

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

    const handlePointerOver = (row: TableRow<any>) => {
        if (props.onHover) {
            props.onHover(row);
        }
    };

    const handlePointerDown = (row: TableRow<any>) => {
        if (props.onClick) {
            props.onClick(row);
        }
    };

    const handleFilterChange = (col: string, value: string) => {
        setFilterValues({ ...filterValues, [col]: value });
    };

    const handleSortDirectionChange = (col: string, dir: SortDirection) => {
        setSortColumnAndDirection({ col, dir });
    };

    if (layoutError.error) {
        return <div>{layoutError.message}</div>;
    }

    return (
        <BaseComponent disabled={props.disabled}>
            <div
                ref={containerRef}
                className="overflow-auto relative"
                style={{ width: props.width, maxHeight: props.height }}
            >
                <table className="w-full h-full border-0 border-separate border-spacing-0">
                    <thead className="border-0 m-0 p-0">
                        <tr className="sticky p-0 border-0">
                            {Object.keys(props.headings).map((col) => (
                                <th
                                    key={col}
                                    className="bg-slate-100 border border-gray-400 border-solid p-0 text-left sticky top-0 drop-shadow"
                                    style={{ width: `${props.headings[col].sizeInPercent}%` }}
                                >
                                    <div className="p-1 flex items-center">
                                        <span className="flex-grow">{props.headings[col].label}</span>
                                        <div className="flex flex-col">
                                            <IconButton
                                                size="small"
                                                onClick={() => handleSortDirectionChange(col, SortDirection.Asc)}
                                                color={
                                                    sortColumnAndDirection.col === col &&
                                                    sortColumnAndDirection.dir === SortDirection.Asc
                                                        ? "danger"
                                                        : undefined
                                                }
                                            >
                                                <ChevronUpIcon />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleSortDirectionChange(col, SortDirection.Desc)}
                                                color={
                                                    sortColumnAndDirection.col === col &&
                                                    sortColumnAndDirection.dir === SortDirection.Desc
                                                        ? "danger"
                                                        : undefined
                                                }
                                            >
                                                <ChevronDownIcon />
                                            </IconButton>
                                        </div>
                                    </div>
                                    <div className="border-gray-400 border-t border-solid p-1">
                                        <Input
                                            type="text"
                                            value={filterValues[col] || ""}
                                            placeholder={`Filter ${props.headings[col].label}...`}
                                            onChange={(e) => handleFilterChange(col, e.target.value)}
                                            endAdornment={
                                                <IconButton size="small" onClick={() => handleFilterChange(col, "")}>
                                                    <XMarkIcon />
                                                </IconButton>
                                            }
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
                                                ? "bg-blue-50 "
                                                : ""
                                        } hover:bg-blue-100`}
                                        onPointerOver={() => handlePointerOver(item.values)}
                                        onPointerDown={() => handlePointerDown(item.values)}
                                        style={{ height: 30 }}
                                    >
                                        {Object.keys(item.values).map((col) => {
                                            const format = props.headings[col].format;
                                            return (
                                                <td key={`${item.id}-${col}`} className="border p-1">
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
