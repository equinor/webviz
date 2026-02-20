import React from "react";

import { Search } from "@mui/icons-material";

import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import { ModuleDataTags, type ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { TemplateRegistry, type Template } from "@framework/TemplateRegistry";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
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

    function applyTemplate(selectedTemplate: Template) {
        props.workbench
            .getSessionManager()
            .applyTemplate(selectedTemplate)
            .then((result) => {
                if (!result) {
                    return;
                }
                setIsOpen(false);
            });
    }

    return (
        <Dialog
            open={isOpen}
            modal
            showCloseCross={true}
            onClose={handleClose}
            title="Templates"
            minHeight={640}
            height="80vh"
            width="800px"
        >
            <div className="h-full flex flex-col">
                <div className="flex gap-2 grow min-h-0">
                    <div className="overflow-y-auto grow min-h-0 max-h-full flex flex-col gap-4">
                        <div>
                            <Input
                                startAdornment={<Search fontSize="small" />}
                                value={searchQuery}
                                onChange={handleSearchQueryChange}
                                placeholder="Enter any keyword or data tag to filter templates..."
                            />
                        </div>
                        <div className="overflow-y-auto grow min-h-0">
                            {TemplateRegistry.getRegisteredTemplates()
                                .filter(
                                    (templ) =>
                                        templ.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        templ.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        extractModuleDataTagIds(templ).some((tagId) => {
                                            const tag = ModuleDataTags.find((el) => el.id === tagId);
                                            return tag?.name.toLowerCase().includes(searchQuery.toLowerCase());
                                        }),
                                )
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
                    <div className="relative min-w-[360px] w-[360px] h-full">
                        <div className="w-full flex flex-col h-full max-h-full overflow-y-auto border-l border-gray-200 bg-gray-50">
                            <TemplateDetails template={template} onApply={applyTemplate} />
                            <div className="min-h-32" />
                        </div>
                        {template && (
                            <div className="bottom-0 h-32 absolute w-full left-1">
                                <div className="w-full h-12 bg-linear-to-t bg-gradient-to-t from-white to-transparent" />
                                <div className="w-full h-20 p-4 bg-white">
                                    <Button
                                        onClick={() => applyTemplate(template)}
                                        disabled={!template}
                                        variant="contained"
                                    >
                                        Use this template
                                    </Button>
                                </div>
                            </div>
                        )}
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
    if (!props.template) {
        return (
            <div className="flex h-full text-gray-500 text-sm justify-center items-center">
                Select a template to see its details
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 p-4">
            <div className="font-bold text-lg">{props.template.name}</div>
            <div className="mt-4">{drawTemplatePreview(props.template, 180, 150)}</div>
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
                            textAnchor="start"
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
                    "box-border text-sm text-gray-700 w-full select-none flex items-center cursor-pointer hover:bg-blue-100 p-2",
                    {
                        "bg-blue-200": props.selected,
                    },
                )}
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
