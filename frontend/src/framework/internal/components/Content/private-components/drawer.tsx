import React from "react";

import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { Input } from "@lib/components/Input";

export type DrawerProps = {
    title: string;
    icon?: React.ReactElement;
    visible: boolean;
    showFilter?: boolean;
    filterPlaceholder?: string;
    onFilterChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    children: React.ReactNode;
};

export const Drawer: React.FC<DrawerProps> = (props) => {
    return (
        <div className={`flex flex-col bg-white min-h-0 h-full${props.visible ? "" : " hidden"}`}>
            <div className="flex justify-center items-center p-2 bg-slate-100 h-10">
                {props.icon && React.cloneElement(props.icon, { className: "w-5 h-5 mr-2" })}
                <span className="font-bold flex-grow p-0 text-sm">{props.title}</span>
            </div>
            <div className="flex-grow flex flex-col">
                {props.showFilter && (
                    <div className="p-2 bg-slate-50">
                        <Input
                            placeholder={props.filterPlaceholder}
                            startAdornment={<MagnifyingGlassIcon className="w-4 h-4" />}
                            onChange={props.onFilterChange}
                        />
                    </div>
                )}
                <div className="p-2 flex-grow min-h-0 overflow-y-auto max-h-full h-0">{props.children}</div>
            </div>
        </div>
    );
};

Drawer.displayName = "Drawer";
