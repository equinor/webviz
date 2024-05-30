import React from "react";

import { Input } from "@lib/components/Input";
import { Close, Search } from "@mui/icons-material";

export type DrawerProps = {
    title: string;
    icon?: React.ReactElement;
    visible: boolean;
    showFilter?: boolean;
    filterPlaceholder?: string;
    onFilterChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClose?: () => void;
    headerChildren?: React.ReactNode;
    children: React.ReactNode;
};

export const Drawer: React.FC<DrawerProps> = (props) => {
    return (
        <div className={`flex flex-col bg-white min-h-0 h-full${props.visible ? "" : " hidden"}`}>
            <div className="flex justify-center items-center p-2 bg-slate-100 h-10">
                {props.icon && React.cloneElement(props.icon, { fontSize: "small", className: "mr-2" })}
                <span className="font-bold flex-grow p-0 text-sm">{props.title}</span>
                {props.onClose && (
                    <Close
                        fontSize="small"
                        className="hover:text-slate-500 cursor-pointer mr-2"
                        onClick={props.onClose}
                    />
                )}
            </div>
            <div className="flex-grow flex flex-col">
                {props.showFilter && (
                    <div className="p-2 bg-slate-50">
                        <Input
                            placeholder={props.filterPlaceholder}
                            startAdornment={<Search fontSize="small" />}
                            onChange={props.onFilterChange}
                        />
                    </div>
                )}
                {props.headerChildren && <div className="p-2 bg-slate-50">{props.headerChildren}</div>}
                <div className="flex-grow min-h-0 overflow-y-auto max-h-full h-0">{props.children}</div>
            </div>
        </div>
    );
};

Drawer.displayName = "Drawer";
