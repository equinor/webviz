import React from "react";

import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import { ModuleDataTags, type ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { TemplateRegistry, type Template } from "@framework/TemplateRegistry";
import type { Workbench } from "@framework/Workbench";
import { Dialog } from "@lib/components/Dialog";
import { Input } from "@lib/components/Input";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type TemplatesDialogProps = {
    workbench: Workbench;
};

export function TemplatesDialog(props: TemplatesDialogProps): React.ReactNode {
    const [isOpen, setIsOpen] = useGuiState(props.workbench.getGuiMessageBroker(), GuiState.TemplatesDialogOpen);

    const [searchQuery, setSearchQuery] = React.useState("");
    const [template, setTemplate] = React.useState<Template | null>(null);

    const handleSearchQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const handleTemplateClick = (templateName: string) => {
        const selectedTemplate = TemplateRegistry.getTemplate(templateName);
        if (!selectedTemplate) {
            return;
        }
        setTemplate(selectedTemplate);
    };

    if (!isOpen) {
        return null;
    }

    function handleClose() {
        setIsOpen(false);
    }

    function handleTemplateApply(selectedTemplate: Template) {
        props.workbench.makeSessionFromTemplate(selectedTemplate);
        setIsOpen(false);
    }

    return (
        <Dialog
            open={isOpen}
            modal
            showCloseCross={true}
            onClose={handleClose}
            title="Templates"
            height="80%"
            width="60%"
            minWidth={800}
        >
            <div className="h-full flex flex-col">
                <div className="flex gap-2 grow min-h-0">
                    <div className="overflow-y-auto grow min-h-0 max-h-full flex flex-col gap-4">
                        <div>
                            <Input
                                value={searchQuery}
                                onChange={handleSearchQueryChange}
                                placeholder="Filter templates..."
                            />
                        </div>
                        <div className="overflow-y-auto grow min-h-0">
                            {TemplateRegistry.getRegisteredTemplates()
                                .filter((templ) => templ.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                .map((templ) => (
                                    <TemplatesListItem
                                        template={templ}
                                        onClick={() => handleTemplateClick(templ.name)}
                                        key={templ.name}
                                        selected={template?.name === templ.name}
                                    />
                                ))}
                        </div>
                    </div>
                    <div className="min-w-[280px] w-[280px] flex flex-col max-h-full overflow-y-auto">
                        <TemplateDetails template={template} onApply={handleTemplateApply} />
                    </div>
                </div>
            </div>
        </Dialog>
    );
}

type TemplateDetailsProps = {
    template: Template | null;
    onApply: (template: Template) => void;
};

function TemplateDetails(props: TemplateDetailsProps): React.ReactNode {
    return (
        <div className="flex flex-col gap-4 bg-gray-50 p-4 h-full border-l border-gray-200">
            {!props.template ? (
                <div className="flex h-full text-gray-500 text-sm justify-center items-center">
                    Select a template to see its details
                </div>
            ) : (
                <>
                    <div className="mt-4">{drawTemplatePreview(props.template, 250, 200)}</div>
                    <div className="font-bold text-lg">{props.template.name}</div>
                    <div className="text-sm text-gray-600">{props.template.description}</div>
                    <div>
                        <strong>Modules:</strong>
                        <ul className="list-disc pl-4 text-sm">
                            {props.template.moduleInstances.map((instance, idx) => {
                                const module = ModuleRegistry.getModule(instance.moduleName);
                                if (!module) {
                                    return null;
                                }
                                return <li key={`${instance.moduleName}-${idx}`}>{module.getDefaultTitle()}</li>;
                            })}
                        </ul>
                    </div>
                    <div>
                        <strong>Data tags:</strong>
                        <div className="text-sm">{makeDataTags(extractModuleDataTagIds(props.template))}</div>
                    </div>
                    <div className="grow" />
                    <div className="mt-4 text-center">
                        <button
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            onClick={() => {
                                props.onApply(props.template!);
                            }}
                        >
                            New session from this template
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

function drawTemplatePreview(template: Template, width: number, height: number): React.ReactNode {
    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            xmlns="http://www.w3.org/2000/svg"
            version="1.1"
        >
            {template.moduleInstances.map((element, idx) => {
                const w = element.layout.relWidth * width;
                const h = element.layout.relHeight * height;
                const x = element.layout.relX * width;
                const y = element.layout.relY * height;
                const strokeWidth = 2;
                const headerHeight = 10;
                const module = ModuleRegistry.getModule(element.moduleName);
                const drawFunc = module.getDrawPreviewFunc();
                return (
                    <g key={`${element.moduleName}-${idx}`}>
                        <rect x={x} y={y} width={w} height={h} fill="white" stroke="#aaa" strokeWidth={strokeWidth} />
                        <rect
                            x={x + strokeWidth / 2}
                            y={y + strokeWidth / 2}
                            width={w - strokeWidth}
                            height={headerHeight}
                            fill="#eee"
                            strokeWidth="0"
                        />
                        <text
                            x={x + strokeWidth}
                            y={y + headerHeight / 2 + strokeWidth / 2}
                            dominantBaseline="middle"
                            textAnchor="left"
                            fontSize="3"
                            fill="#000"
                        >
                            {element.moduleName}
                        </text>
                        <g transform={`translate(${x + 2 * strokeWidth}, ${y + headerHeight + 2 * strokeWidth})`}>
                            {drawFunc && drawFunc(w - 4 * strokeWidth, h - headerHeight - 4 * strokeWidth)}
                        </g>
                    </g>
                );
            })}
        </svg>
    );
}

type TemplatesListItemProps = {
    selected?: boolean;
    template: Template;
    onClick: () => void;
};

const TemplatesListItem: React.FC<TemplatesListItemProps> = (props) => {
    const dataTagIds = extractModuleDataTagIds(props.template);
    return (
        <>
            <div
                className={resolveClassNames(
                    "box-border text-sm text-gray-700 w-full select-none flex cursor-pointer hover:bg-blue-100 p-2",
                    {
                        "bg-blue-200": props.selected,
                    },
                )}
                title="Click to apply this template"
                onClick={props.onClick}
            >
                <div style={{ width: 64, height: 64 }}>
                    {props.template && drawTemplatePreview(props.template, 64, 64)}
                </div>
                <div className="ml-4">
                    <div className="font-bold">{props.template.name}</div>
                    <div className="line-clamp-1" title={props.template?.description}>
                        {props.template?.description}
                    </div>
                    <div className="text-xs mt-2 flex gap-2 text-bold flex-wrap">{makeDataTags(dataTagIds)}</div>
                </div>
            </div>
        </>
    );
};

function makeDataTags(tagIds: ModuleDataTagId[]): React.ReactNode[] {
    const tags: React.ReactNode[] = [];
    for (const tag of tagIds) {
        const tagObj = ModuleDataTags.find((el) => el.id === tag);
        if (tagObj) {
            tags.push(
                <div key={tag} className="text-indigo-600">
                    #{tagObj.name}
                </div>,
            );
        }
    }

    return tags;
}

function extractModuleDataTagIds(template: Template): ModuleDataTagId[] {
    const tagIds: ModuleDataTagId[] = [];
    template.moduleInstances.forEach((instance) => {
        const module = ModuleRegistry.getModule(instance.moduleName);
        if (!module) {
            return;
        }
        const instanceTagIds = module.getDataTagIds();
        tagIds.push(...instanceTagIds);
    });
    return Array.from(new Set(tagIds));
}
