import React from "react";

import { LayoutEvents, LayoutPage } from "@framework/Layout";
import { Workbench } from "@framework/Workbench";
import { PencilIcon, PlusIcon, TrashIcon } from "@heroicons/react/20/solid";
import { IconButton } from "@lib/components/IconButton";
import { resolveClassNames } from "@lib/components/_utils/resolveClassNames";

type PageTabProps = {
    page: LayoutPage;
    isActive: boolean;
    onClick: () => void;
    onDelete: () => void;
    onNameChange: (newName: string) => void;
};

const PageTab: React.FC<PageTabProps> = (props) => {
    const [isEditing, setIsEditing] = React.useState<boolean>(false);
    const [name, setName] = React.useState<string>("");
    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleClick = () => {
        if (isEditing || props.isActive) {
            return;
        }
        props.onClick();
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        setName(newName);
        props.onNameChange(newName);
    };

    const handleDoubleClick = () => {
        setIsEditing(true);
    };

    React.useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
        }
    }, [isEditing]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter") {
            setIsEditing(false);
        }
    };

    const handleBlur = () => {
        setIsEditing(false);
    };

    const handleDeleteClick = () => {
        props.onDelete();
    };

    if (props.page.name !== name) {
        setName(props.page.name);
        if (inputRef.current !== null) {
            inputRef.current.value = props.page.name;
        }
    }

    return (
        <div
            className={resolveClassNames("p-2", "rounded-t", "text-center", "border", "cursor-pointer", {
                "bg-blue-300": props.isActive,
                "bg-white": !props.isActive,
            })}
            onClick={handleClick}
        >
            <input
                type="text"
                className={resolveClassNames(
                    "outline-none",
                    "bg-transparent",
                    "text-inherit",
                    "min-w-0",
                    "w-20",
                    "w-full",
                    "box-border",
                    isEditing ? "block" : "hidden"
                )}
                onChange={handleNameChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                ref={inputRef}
                value={name}
            />
            <span
                onDoubleClick={handleDoubleClick}
                className={resolveClassNames(
                    !isEditing ? "block" : "hidden",
                    "whitespace-nowrap",
                    "flex",
                    "items-center"
                )}
            >
                {props.page.name}
                {props.isActive && (
                    <IconButton className="ml-2" onClick={handleDeleteClick}>
                        <TrashIcon className="w-4 h-4" />
                    </IconButton>
                )}
            </span>
        </div>
    );
};

export type PageTabsProps = {
    workbench: Workbench;
};

export const PageTabs: React.FC<PageTabsProps> = (props) => {
    const [activePageUuid, setActivePageUuid] = React.useState<string | null>(
        props.workbench.getLayout().getActivePageUuid()
    );

    React.useEffect(() => {
        const handleActivePageChange = () => {
            setActivePageUuid(props.workbench.getLayout().getActivePageUuid());
        };

        const unsubscribeFunc = props.workbench
            .getLayout()
            .subscribe(LayoutEvents.ActivePageChanged, handleActivePageChange);

        return unsubscribeFunc;
    }, [props.workbench]);

    const handlePageClick = (page: LayoutPage) => {
        props.workbench.getLayout().setActivePageUuid(page.uuid);
    };

    const handlePageNameChange = (page: LayoutPage, newName: string) => {
        props.workbench.getLayout().setPageName(page.uuid, newName);
    };

    const handleAddPageClick = () => {
        props.workbench.getLayout().addPage();
    };

    const pages = props.workbench.getLayout().getPages();

    return (
        <div className="flex items-end">
            {pages.map((page) => {
                return (
                    <PageTab
                        key={page.uuid}
                        page={page}
                        isActive={page.uuid === activePageUuid}
                        onClick={() => handlePageClick(page)}
                        onNameChange={(newName) => handlePageNameChange(page, newName)}
                        onDelete={() => props.workbench.getLayout().removePage(page.uuid)}
                    />
                );
            })}
            <div className="p-2 rounded-t text-center border cursor-pointer bg-slate-300" onClick={handleAddPageClick}>
                <PlusIcon className="w-6 h-6" />
            </div>
            <div className="flex-grow" />
        </div>
    );
};
