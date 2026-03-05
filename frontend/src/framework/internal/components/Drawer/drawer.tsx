import React from "react";

import { Close, MoreVert, Search } from "@mui/icons-material";

import { DenseIconButton } from "@lib/components/DenseIconButton";
import { Input } from "@lib/components/Input";
import { Menu } from "@lib/components/Menu";
import { Tooltip } from "@lib/components/Tooltip";

export type DrawerFilterItem<T extends string | number> = {
    label: React.ReactNode;
    value: T;
    initiallySelected: boolean;
};

export type DrawerProps<T extends string | number> = {
    title: string;
    icon?: React.ReactElement;
    visible: boolean;
    showSearch?: boolean;
    filterItems?: DrawerFilterItem<T>[];
    onFilterItemSelectionChange?: (selectedItems: T[]) => void;
    searchInputPlaceholder?: string;
    onSearchQueryChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClose?: () => void;
    actions?: React.ReactNode;
    headerChildren?: React.ReactNode;
    children: React.ReactNode;
};

export function Drawer<T extends string | number>(props: DrawerProps<T>) {
    const { onFilterItemSelectionChange } = props;
    const [selectedFilterItems, setSelectedFilterItems] = React.useState<T[]>(
        props.filterItems?.filter((item) => item.initiallySelected).map((item) => item.value) ?? [],
    );
    const [open, setOpen] = React.useState(false);

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen); // allow other close reasons (outside click, Escape, etc.)
    };

    const handleFilterItemClick = React.useCallback(
        function handleFilterItemClick(itemValue: string) {
            setSelectedFilterItems((prevSelectedItems) => {
                let newSelectedItems: T[];

                if (prevSelectedItems.some((i) => itemValue === String(i))) {
                    newSelectedItems = prevSelectedItems.filter((value) => value !== itemValue);
                } else {
                    const item = props.filterItems?.find((i) => String(i.value) === itemValue);
                    newSelectedItems = [...prevSelectedItems, item!.value];
                }

                onFilterItemSelectionChange?.(newSelectedItems);
                return newSelectedItems;
            });
        },
        [onFilterItemSelectionChange, props.filterItems],
    );

    const showFilter = props.filterItems && props.filterItems.length > 0;

    return (
        <div className={`flex flex-col bg-white min-h-0 h-full${props.visible ? "" : " hidden"}`}>
            <div className="flex justify-center items-center p-2 bg-slate-100 h-10 shadow-sm">
                {props.icon && React.cloneElement(props.icon, { fontSize: "small", className: "mr-2" })}
                <span className="font-bold grow p-0 text-sm">{props.title}</span>
                {props.actions}
                {props.onClose && (
                    <Tooltip title="Close">
                        <DenseIconButton onClick={props.onClose}>
                            <Close fontSize="inherit" />
                        </DenseIconButton>
                    </Tooltip>
                )}
            </div>
            <div className="grow flex flex-col h-auto">
                {(props.showSearch || showFilter) && (
                    <div className="flex gap-2 bg-slate-50 p-2">
                        {props.showSearch && (
                            <div className="grow">
                                <Input
                                    placeholder={props.searchInputPlaceholder}
                                    startAdornment={<Search fontSize="small" />}
                                    onChange={props.onSearchQueryChange}
                                />
                            </div>
                        )}
                        {showFilter && props.filterItems?.length && (
                            <Menu
                                open={open}
                                onOpenChange={handleOpenChange}
                                closeOnClick={false}
                                onActionClicked={(id) => handleFilterItemClick(id)}
                                items={props.filterItems.map((item) => ({
                                    id: String(item.value),
                                    checked: selectedFilterItems.includes(item.value),
                                    label: item.label,
                                }))}
                            >
                                <MoreVert fontSize="small" />
                            </Menu>
                        )}
                    </div>
                )}
                {props.headerChildren && <div className="p-2 bg-slate-50">{props.headerChildren}</div>}
                <div className="grow min-h-0 overflow-y-auto max-h-full h-0">{props.children}</div>
            </div>
        </div>
    );
}
