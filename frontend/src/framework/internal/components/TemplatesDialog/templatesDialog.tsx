import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { TemplateRegistry, type Template } from "@framework/TemplateRegistry";
import type { Workbench } from "@framework/Workbench";
import { Dialog } from "@lib/components/Dialog";
import { Input } from "@lib/components/Input";
import React from "react";

export type TemplatesDialogProps = {
    workbench: Workbench;
};

export function TemplatesDialog(props: TemplatesDialogProps): React.ReactNode {
    const [isOpen, setIsOpen] = useGuiState(props.workbench.getGuiMessageBroker(), GuiState.TemplatesDialogOpen);

    const [searchQuery, setSearchQuery] = React.useState("");
    const [template, setTemplate] = React.useState<Template | null>(null);
    const [templateName, setTemplateName] = React.useState("");

    const handleSearchQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const handleTemplateClick = (templateName: string) => {
        setTemplateName(templateName);
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
        <Dialog open={isOpen} modal showCloseCross={true} onClose={handleClose} title="Templates" height="80%">
            <div className="h-full flex flex-col">
                <div className="flex gap-2 grow min-h-0">
                    <div className="w-2/3 overflow-y-auto grow min-h-0 max-h-full flex flex-col gap-4">
                        <div>
                            <Input
                                value={searchQuery}
                                onChange={handleSearchQueryChange}
                                placeholder="Filter templates..."
                            />
                        </div>
                        <div className="overflow-y-auto grow min-h-0">
                            {Object.keys(TemplateRegistry.getRegisteredTemplates())
                                .filter((templName) => templName.toLowerCase().includes(searchQuery.toLowerCase()))
                                .map((templName) => (
                                    <TemplatesListItem
                                        onClick={() => handleTemplateClick(templName)}
                                        key={templName}
                                        templateName={templName}
                                    />
                                ))}
                        </div>
                    </div>
                    <div className="w-1/3 flex flex-col max-h-full overflow-y-auto">
                        {!template ? (
                            <div className="text-gray-500">Select a template to see its details and apply it.</div>
                        ) : (
                            <TemplateDetails name={templateName} template={template} onApply={handleTemplateApply} />
                        )}
                    </div>
                </div>
            </div>
        </Dialog>
    );
}

type TemplateDetailsProps = {
    name: string;
    template: Template;
    onApply: (template: Template) => void;
};

function TemplateDetails(props: TemplateDetailsProps): React.ReactNode {
    return (
        <div className="flex flex-col gap-2 bg-gray-50 p-4 h-full">
            <div className="mt-4">{drawTemplatePreview(props.template, 250, 150)}</div>
            <div className="font-bold text-lg">{props.name}</div>
            <div className="text-sm text-gray-600">{props.template.description}</div>
            <div className="grow" />
            <div className="mt-4">
                <button
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    onClick={() => {
                        props.onApply(props.template);
                    }}
                >
                    Create session based on template
                </button>
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
    templateName: string;
    onClick: () => void;
};

const TemplatesListItem: React.FC<TemplatesListItemProps> = (props) => {
    const ref = React.useRef<HTMLDivElement>(null);
    const mainRef = React.useRef<HTMLDivElement>(null);

    const template = TemplateRegistry.getTemplate(props.templateName);

    return (
        <>
            <div
                ref={mainRef}
                className="mb-4 box-border text-sm text-gray-700 w-full select-none flex cursor-pointer hover:bg-blue-100 p-2"
                title="Click to apply this template"
                onClick={props.onClick}
            >
                <div ref={ref} style={{ width: 100, height: 100 }}>
                    {template && drawTemplatePreview(template, 100, 100)}
                </div>
                <div className="ml-4">
                    <div className="font-bold">{props.templateName}</div>
                    <div className="line-clamp-3" title={template?.description}>
                        {template?.description}
                    </div>
                </div>
            </div>
        </>
    );
};
