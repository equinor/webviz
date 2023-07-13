import React from "react";

import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/20/solid";
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
        <div className={`flex flex-col bg-white min-h-0 h-full${props.visible ? "" : " hidden"}`}>
            <div className="flex justify-center items-center p-2 bg-slate-100 h-10">
                <span className="font-bold flex-grow p-0 text-sm">{props.title}</span>
                <div className="hover:text-slate-500 cursor-pointer" onPointerDown={props.onClose} title="Close">
                    <XMarkIcon className="w-4 h-4" />
                </div>
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
