import React from "react";

import { Search } from "@mui/icons-material";

import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import { ModuleDataTags, type ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { TemplateRegistry, type Template } from "@framework/TemplateRegistry";
import type { Workbench } from "@framework/Workbench";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Dialog } from "@lib/newComponents/Dialog";
import { TextInput } from "@lib/newComponents/TextInput";
import { Heading } from "@lib/newComponents/Typography/compositions";
import { Button } from "@lib/newComponents/Button";

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
        <Dialog.Popup
            open={isOpen}
            modal
            onOpenChange={(open) => setIsOpen(open)}
            minHeight={640}
            height="80vh"
            width="800px"
        >
            <Dialog.Header closeIconVisible>
                <Dialog.Title>Templates</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body layoutClassName="grow min-h-0">
                <div className="flex h-full flex-col">
                    <div className="gap-x-2xs flex min-h-0 grow">
                        <div className="gap-y-xs flex max-h-full min-h-0 grow flex-col overflow-y-auto">
                            <div className="px-3xs py-3xs">
                                <TextInput
                                    startAdornment={<Search fontSize="small" />}
                                    value={searchQuery}
                                    onChange={handleSearchQueryChange}
                                    placeholder="Enter any keyword or data tag to filter templates..."
                                />
                            </div>
                            <div className="min-h-0 grow overflow-y-auto">
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
                        <div className="relative h-full w-[360px] min-w-[360px]">
                            <div className="border-neutral flex h-full max-h-full w-full flex-col overflow-y-auto border-l bg-gray-50">
                                <TemplateDetails template={template} onApply={applyTemplate} />
                                <div className="min-h-32" />
                            </div>
                            {template && (
                                <div className="absolute bottom-0 left-1 h-32 w-full">
                                    <div className="h-12 w-full bg-linear-to-t from-white to-transparent" />
                                    <div className="px-xs py-xs bg-surface h-20 w-full">
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
            </Dialog.Body>
        </Dialog.Popup>
    );
}

type TemplateDetailsProps = {
    template: Template | null;
    onApply: (template: Template) => void;
};

function TemplateDetails(props: TemplateDetailsProps): React.ReactNode {
    if (!props.template) {
        return (
            <div className="text-neutral-subtle text-body-sm flex h-full items-center justify-center">
                Select a template to see its details
            </div>
        );
    }

    return (
        <div className="gap-y-sm px-sm py-xs flex flex-col">
            <Heading as="h6">{props.template.name}</Heading>
            {drawTemplatePreview(props.template, 180, 150)}
            <div className="text-neutral-subtle text-sm">{props.template.description}</div>
            <div>
                <strong>Modules:</strong>
                <ul className="pl-md list-disc text-sm">
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
                    "group selectable hpx-2xs py-2xs gap-x-xs box-border flex w-full cursor-pointer items-center text-sm select-none",
                    {
                        "bg-accent-strong text-neutral-strong-on-emphasis hover:bg-accent-strong-hover active:bg-accent-strong-active":
                            props.selected,
                    },
                )}
                data-selected={props.selected ? "true" : undefined}
                onClick={props.onClick}
            >
                <div style={{ width: 64, height: 64 }}>
                    {props.template && drawTemplatePreview(props.template, 64, 64)}
                </div>
                <div>
                    <div className="font-bolder">{props.template.name}</div>
                    <div className="text-body-xs line-clamp-1" title={props.template?.description}>
                        {props.template?.description}
                    </div>
                    <div className="text-bolder mt-xs gap-x-2xs flex flex-wrap text-xs">
                        {makeDataTags(dataTagIds)}
                    </div>
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
                <div key={tag} className="text-accent-subtle group-data-selected:text-accent-strong-on-emphasis">
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
