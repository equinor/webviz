import type React from "react";

import { Delete, DragIndicator } from "@mui/icons-material";

import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { Button } from "@lib/components/Button";
import { ColorSelect } from "@lib/components/ColorSelect";
import { SortableList } from "@lib/components/SortableList";
import { Table } from "@lib/components/Table";
import { TextInput } from "@lib/components/TextInput";
import { Tooltip } from "@lib/components/Tooltip";

import type { InternalRegularEnsembleSetting } from "../../types";

export type RegularEnsembleRowProps = {
    ensembleSetting: InternalRegularEnsembleSetting;
    onUpdate: (newItem: InternalRegularEnsembleSetting) => void;
    onDelete: (item: RegularEnsembleIdent) => void;
};

export function RegularEnsembleRow(props: RegularEnsembleRowProps): React.ReactNode {
    function handleColorChange(newColor: string) {
        props.onUpdate({
            ...props.ensembleSetting,
            color: newColor,
        });
    }

    function handleNameChange(newName: string) {
        props.onUpdate({
            ...props.ensembleSetting,
            customName: newName || null,
        });
    }

    function handleDelete() {
        props.onDelete(props.ensembleSetting.ensembleIdent);
    }

    return (
        <SortableList.Item
            key={props.ensembleSetting.ensembleIdent.toString()}
            id={props.ensembleSetting.ensembleIdent.toString()}
        >
            <Table.Row>
                <Table.Cell layoutClassName="*:justify-center">
                    <SortableList.DragHandle>
                        <DragIndicator fontSize="inherit" className="pointer-events-none" />
                    </SortableList.DragHandle>
                </Table.Cell>
                <Table.Cell>
                    <ColorSelect size="small" value={props.ensembleSetting.color} onValueCommit={handleColorChange} />
                </Table.Cell>
                <Table.Cell>
                    <TextInput
                        size="small"
                        value={props.ensembleSetting.customName ?? ""}
                        placeholder="Give a custom name..."
                        onValueChange={handleNameChange}
                    />
                </Table.Cell>
                <Table.Cell layoutClassName="truncate" title={props.ensembleSetting.caseName}>
                    {props.ensembleSetting.caseName}
                </Table.Cell>
                <Table.Cell>
                    <div className="truncate" title={props.ensembleSetting.ensembleIdent.getEnsembleName()}>
                        {props.ensembleSetting.ensembleIdent.getEnsembleName()}
                    </div>
                </Table.Cell>
                <Table.Cell>
                    <Tooltip content="Remove this ensemble from the list" delay="medium">
                        <Button variant="ghost" tone="danger" onClick={handleDelete} size="small" iconOnly>
                            <Delete fontSize="inherit" />
                        </Button>
                    </Tooltip>
                </Table.Cell>
            </Table.Row>
        </SortableList.Item>
    );
}
