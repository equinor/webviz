import React from "react";

import { chain } from "lodash";

import type { CategoricalReadout, ReadoutProperty } from "./types";

export type ReadoutListProps = {
    className: React.HTMLAttributes<HTMLUListElement>["className"];
    readouts: CategoricalReadout[];
    /**
     * An adornment that shows on the first item or group name, whichever show up first.
     */
    firstTitleAdornment?: React.ReactNode;
};

export function ReadoutList(props: ReadoutListProps): React.ReactNode {
    let titleCount = 0;
    const numGroups = chain(props.readouts).map("group").uniq().value().length;

    const groupEntries = React.useMemo(() => {
        return chain(props.readouts)
            .groupBy((readout) => readout.group ?? "default")
            .entries()
            .sortBy(([group]) => (group === "default" ? 0 : 1)) // Default should always be first
            .value();
    }, [props.readouts]);

    function makeTitleAdornment() {
        titleCount++;
        if (titleCount === 1) {
            return props.firstTitleAdornment;
        } else {
            return null;
        }
    }

    return (
        <ul className={props.className + " space-y-2"}>
            {groupEntries.map(([group, groupReadouts], groupIdx) => (
                <li key={group}>
                    {numGroups > 1 && group !== "default" && (
                        <GroupTitle name={group} endAdornment={makeTitleAdornment()} />
                    )}
                    <ul className="space-y-2">
                        {groupReadouts.map((readout, idx) => (
                            <ReadoutItem
                                key={`${readout.name}-${groupIdx}-${idx}`}
                                readout={readout}
                                titleAdornment={makeTitleAdornment()}
                            />
                        ))}
                    </ul>
                </li>
            ))}
        </ul>
    );
}

function GroupTitle(props: { name: string | "default" | undefined; endAdornment?: React.ReactNode }): React.ReactNode {
    if (!props.name || props.name === "default") return null;

    return (
        <div className="flex items-center gap-1 text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 mt-2 first:mt-0">
            {props.name} <hr className="w-full h-px bg-black" /> {props.endAdornment}
        </div>
    );
}

function ReadoutItem(props: { readout: CategoricalReadout; titleAdornment: React.ReactNode }): React.ReactNode {
    const { readout } = props;

    return (
        <li className="text-sm">
            <ReadoutItemTitle name={readout.name} icon={readout.icon} titleAdornment={props.titleAdornment} />
            <ReadoutPropertyList properties={readout.properties} />
        </li>
    );
}

function ReadoutItemTitle(props: {
    name: string;
    icon?: React.ReactNode;
    titleAdornment: React.ReactNode;
}): React.ReactNode {
    return (
        <div className="flex items-center gap-1 mb-1">
            {props.icon && <span className="w-4 h-4">{props.icon}</span>}
            <span className="font-semibold text-sm text-black h-4">{props.name}</span>
            {props.titleAdornment}
        </div>
    );
}

function ReadoutPropertyList(props: { properties?: ReadoutProperty<any>[] }): React.ReactNode {
    if (!props.properties?.length) return null;

    return (
        <ul className="ml-1.5 border-l-4 pl-2 border-gray-200 text-gray-700  [&_.--readout-label]:font-bold">
            {props.properties.map((property, idx) => (
                <ReadoutPropertyItem key={`${property.name}-${idx}`} property={property} />
            ))}
        </ul>
    );
}

function ReadoutPropertyItem<T = unknown>(props: { property: ReadoutProperty<T> }): React.ReactNode {
    const { property } = props;

    if (property.render) {
        return property.render(property.name, property.value);
    }

    return (
        <li className="flex gap-2 text-xs">
            <span className="--readout-label">{property.name}:</span>
            <span>{String(property.value)}</span>
        </li>
    );
}
