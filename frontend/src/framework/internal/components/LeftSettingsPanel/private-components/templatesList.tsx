import React from "react";

import { GridView } from "@mui/icons-material";

import { GuiState, LeftDrawerContent, useGuiState } from "@framework/GuiMessageBroker";
import { Drawer } from "@framework/internal/components/Drawer";
import { TemplateRegistry } from "@framework/TemplateRegistry";
import type { Workbench } from "@framework/Workbench";
import { DashboardPreview } from "../../DashboardPreview/dashboardPreview";

type TemplatesListItemProps = {
    templateName: string;
    onClick: () => void;
};

const TemplatesListItem: React.FC<TemplatesListItemProps> = (props) => {
    const ref = React.useRef<HTMLDivElement>(null);
    const mainRef = React.useRef<HTMLDivElement>(null);

    const template = TemplateRegistry.getTemplate(props.templateName);
    const layout = template?.moduleInstances.map((mi) => ({ ...mi.layout, moduleName: mi.moduleName })) || [];

    return (
        <>
            <div
                ref={mainRef}
                className="mb-4 box-border text-sm text-gray-700 w-full select-none flex cursor-pointer hover:bg-blue-100 p-2"
                title="Click to apply this template"
                onClick={props.onClick}
            >
                <div ref={ref} style={{ width: 100, height: 100 }}>
                    {template && <DashboardPreview layout={layout} width={100} height={100} />}
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
    const [drawerContent, setDrawerContent] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.LeftDrawerContent,
    );
    const [searchQuery, setSearchQuery] = React.useState("");

    const handleSearchQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const handleTemplateClick = (templateName: string) => {
        const template = TemplateRegistry.getTemplate(templateName);
        if (!template) {
            return;
        }
        // props.workbench.applyTemplate(template);
        setDrawerContent(LeftDrawerContent.ModuleSettings);
    };

    return (
        <Drawer
            showFilter
            onFilterChange={handleSearchQueryChange}
            filterPlaceholder="Filter templates..."
            title="Select a template"
            icon={<GridView />}
            visible={drawerContent === LeftDrawerContent.TemplatesList}
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
