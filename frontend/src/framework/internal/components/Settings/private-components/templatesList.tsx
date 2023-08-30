import React from "react";

import { ModuleRegistry } from "@framework/ModuleRegistry";
import { useStoreState } from "@framework/StateStore";
import { Template, TemplateRegistry } from "@framework/TemplateRegistry";
import { DrawerContent, Workbench } from "@framework/Workbench";
import { Drawer } from "@framework/internal/components/Drawer";
import { Squares2X2Icon } from "@heroicons/react/20/solid";

function drawTemplatePreview(template: Template, width: number, height: number): React.ReactNode {
    return (
        <svg width={width} height={height} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" version="1.1">
            {template.moduleInstances.map((element) => {
                const w = element.layout.relWidth * width;
                const h = element.layout.relHeight * height;
                const x = element.layout.relX * width;
                const y = element.layout.relY * height;
                const strokeWidth = 2;
                const headerHeight = 10;
                const module = ModuleRegistry.getModule(element.moduleName);
                const drawFunc = module.getDrawPreviewFunc();
                return (
                    <g key={element.moduleName}>
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

type TemplatesListProps = {
    workbench: Workbench;
};

/*
    @rmt: This component does probably need virtualization and therefore refactoring. 
    As this includes a lot more implementation, 
    I will skip it for now and come back to it when it becomes a problem.
*/
export const TemplatesList: React.FC<TemplatesListProps> = (props) => {
    const [drawerContent, setDrawerContent] = useStoreState(props.workbench.getGuiStateStore(), "drawerContent");
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
        setDrawerContent(DrawerContent.ModuleSettings);
    };

    return (
        <Drawer
            showFilter
            onFilterChange={handleSearchQueryChange}
            filterPlaceholder="Filter templates..."
            title="Select a template"
            icon={<Squares2X2Icon />}
            visible={drawerContent === DrawerContent.TemplatesList}
        >
            {Object.keys(TemplateRegistry.getRegisteredTemplates())
                .filter((templName) => templName.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((templName) => (
                    <TemplatesListItem
                        onClick={() => handleTemplateClick(templName)}
                        key={templName}
                        templateName={templName}
                    />
                ))}
        </Drawer>
    );
};
