import React from "react";

import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/20/solid";
import { IconButton } from "@lib/components/IconButton";
import { Input } from "@lib/components/Input";

export type DrawerProps = {
    title: string;
    visible: boolean;
    showFilter?: boolean;
    filterPlaceholder?: string;
    onFilterChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClose: () => void;
    children: React.ReactNode;
};

export const Drawer: React.FC<DrawerProps> = (props) => {
    return (
        <div className={`flex flex-col shadow bg-white w-96 min-h-0 h-full${props.visible ? "" : " hidden"}`}>
            <div className="flex justify-center items-center p-2 pl-4 pr-4 bg-slate-50">
                <span className="text-lg flex-grow p-0">{props.title}</span>
                <IconButton onClick={props.onClose} title="Close drawer">
                    <XMarkIcon className="w-5 h-5" />
                </IconButton>
            </div>
            <div className="p-4 flex-grow flex flex-col">
                {props.showFilter && (
                    <Input
                        placeholder={props.filterPlaceholder}
                        startAdornment={<MagnifyingGlassIcon className="w-4 h-4" />}
                        onChange={props.onFilterChange}
                    />
                )}
                <div className="mt-4 flex-grow min-h-0 overflow-y-auto max-h-full h-0">{props.children}</div>
            </div>
        </div>
    );
};

Drawer.displayName = "Drawer";
