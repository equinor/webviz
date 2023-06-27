import React from "react";

import { useStoreState } from "@framework/StateStore";
import { Template, TemplateRegistry } from "@framework/TemplateRegistry";
import { Workbench } from "@framework/Workbench";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/20/solid";
import { IconButton } from "@lib/components/IconButton";
import { Input } from "@lib/components/Input";

function drawTemplatePreview(template: Template, width: number, height: number): React.ReactNode {
    return (
        <svg width={width} height={height} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" version="1.1">
            {template.layout.map((module, index) => {
                const w = module.relWidth * width;
                const h = module.relHeight * height;
                const x = module.relX * width;
                const y = module.relY * height;
                const strokeWidth = 2;
                const headerHeight = 10;
                return (
                    <g key={module.moduleName}>
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
                            {module.moduleName}
                        </text>
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
                    {template?.description}
                </div>
            </div>
        </>
    );
};

type TemplatesListProps = {
    workbench: Workbench;
    relContainer: HTMLDivElement | null;
};

/*
    @rmt: This component does probably need virtualization and therefore refactoring. 
    As this includes a lot more implementation, 
    I will skip it for now and come back to it when it becomes a problem.
*/
export const TemplatesList: React.FC<TemplatesListProps> = (props) => {
    const [visible, setVisible] = useStoreState(props.workbench.getGuiStateStore(), "templatesListOpen");
    const [searchQuery, setSearchQuery] = React.useState("");

    const handleSearchQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const handleTemplateClick = (templateName: string) => {
        const template = TemplateRegistry.getTemplate(templateName);
        if (!template) {
            return;
        }
        props.workbench.applyTemplate(template);
    };

    return (
        <div className={`flex flex-col shadow bg-white p-4 w-96 min-h-0 h-full${visible ? "" : " hidden"}`}>
            <div className="flex justify-center items-center mb-4">
                <span className="text-lg flex-grow p-0">Select a template</span>
                <IconButton onClick={() => setVisible(false)} title="Close templates list">
                    <XMarkIcon className="w-5 h-5" />
                </IconButton>
            </div>
            <Input
                placeholder="Filter templates..."
                startAdornment={<MagnifyingGlassIcon className="w-4 h-4" />}
                onChange={handleSearchQueryChange}
            />
            <div className="mt-4 flex-grow min-h-0 overflow-y-auto max-h-full h-0">
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
    );
};
