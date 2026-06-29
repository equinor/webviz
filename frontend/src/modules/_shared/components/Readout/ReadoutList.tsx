import React from "react";

import { chain } from "lodash-es";

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
        <ul className={`${props.className ?? ""} space-y-2`}>
            {groupEntries.map(([group, groupReadouts], groupIdx) => (
                <li key={group} className="group">
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
        <div className="gap-3xs font-bolder text-neutral-subtle mt-xs mb-3xs text-body-sm tracking-body-xs-wide flex items-center uppercase group-first:mt-0">
            {props.name} <div className="bg-neutral-strong h-px w-full" /> {props.endAdornment}
        </div>
    );
}

function ReadoutItem(props: { readout: CategoricalReadout; titleAdornment: React.ReactNode }): React.ReactNode {
    const { readout } = props;

    return (
        <li className="text-body-sm">
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
        <div className="mb-3xs gap-3xs flex items-center">
            {props.icon && <span className="h-4 w-4">{props.icon}</span>}
            <span className="text-body-sm font-bolder text-neutral-strong h-4">{props.name}</span>
            {props.titleAdornment}
        </div>
    );
}

function ReadoutPropertyList(props: { properties?: ReadoutProperty<any>[] }): React.ReactNode {
    if (!props.properties?.length) return null;

    return (
        <dl className="ml-4xs border-neutral-subtle pl-2xs text-neutral-subtle w-full border-l-2">
            {props.properties.map((property, idx) => (
                <ReadoutPropertyItem key={`${property.name}-${idx}`} property={property} />
            ))}
        </dl>
    );
}

function ReadoutPropertyItem<T = unknown>(props: { property: ReadoutProperty<T> }): React.ReactNode {
    const { property } = props;
    const valueFormat = property.format ?? String;

    if (property.render) {
        return <>{property.render(property.name, property.value)}</>;
    }

    return (
        <div className="gap-2xs text-body-xs flex justify-between">
            <dt className="font-extrabold">{property.name}:</dt>
            <dd className="m-0 text-right">{valueFormat(property.value)}</dd>
        </div>
    );
}
