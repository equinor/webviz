import type React from "react";

import { ArrowBack, ArrowForward } from "@mui/icons-material";

import { Button } from "@lib/components/Button";
import { Tooltip } from "@lib/components/Tooltip";

import type { Item } from "../../interfacesAndTypes/entities";

function describeSelection(ids: string[], itemsById: Map<string, Item>): string {
    const firstName = itemsById.get(ids[0])?.getItemDelegate().getName() ?? "";
    return ids.length > 1 ? `${firstName} and ${ids.length - 1} more` : firstName;
}

type NavigationButtonProps = {
    label: string;
    target: string[] | null;
    itemsById: Map<string, Item>;
    icon: React.ReactNode;
    onClick: () => void;
};

function NavigationButton(props: NavigationButtonProps): React.ReactNode {
    const tooltip = props.target ? `${props.label} to ${describeSelection(props.target, props.itemsById)}` : undefined;
    return (
        <Tooltip content={tooltip} side="bottom">
            <Button
                variant="ghost"
                tone="neutral"
                size="small"
                iconOnly
                aria-label={tooltip ?? props.label}
                disabled={!props.target}
                onClick={props.onClick}
            >
                {props.icon}
            </Button>
        </Tooltip>
    );
}

export type HistoryNavigationButtonsProps = {
    backTarget: string[] | null;
    forwardTarget: string[] | null;
    itemsById: Map<string, Item>;
    onBack: () => void;
    onForward: () => void;
};

/** Back / forward between previously shown selections (also Alt+← / Alt+→). */
export function HistoryNavigationButtons(props: HistoryNavigationButtonsProps): React.ReactNode {
    return (
        <span className="flex shrink-0 items-center">
            <NavigationButton
                label="Back"
                target={props.backTarget}
                itemsById={props.itemsById}
                icon={<ArrowBack fontSize="inherit" />}
                onClick={props.onBack}
            />
            <NavigationButton
                label="Forward"
                target={props.forwardTarget}
                itemsById={props.itemsById}
                icon={<ArrowForward fontSize="inherit" />}
                onClick={props.onForward}
            />
        </span>
    );
}
