import React from "react";

import { DragIndicator } from "@mui/icons-material";

import { SortableList } from "@lib/components/SortableList";

type ItemOrGroup = {
    id: string;
    type: "item" | "group";
    children?: ItemOrGroup[];
};

export function View(): React.ReactNode {
    const [items, setItems] = React.useState<ItemOrGroup[]>([
        {
            id: "Group 1",
            type: "group",
            children: [
                { id: "Item 1", type: "item" },
                { id: "Item 2", type: "item" },
            ],
        },
        {
            id: "Group 2",
            type: "group",
            children: [
                { id: "Item 3", type: "item" },
                { id: "Item 4", type: "item" },
                { id: "Item 5", type: "item" },
            ],
        },
    ]);

    function onMove(movedItemId: string, originId: string | null, destinationId: string | null, position: number) {
        // Update the items state based on the move
        setItems((prevItems) => {
            const newItems = [...prevItems];
            if (originId !== destinationId) {
                const originGroupIndex = newItems.findIndex((item) => item.id === originId && item.type === "group");
                const destinationGroupIndex = newItems.findIndex(
                    (item) => item.id === destinationId && item.type === "group",
                );
                const originGroupChildren = originGroupIndex !== -1 ? newItems[originGroupIndex].children : newItems;
                const destinationGroupChildren =
                    destinationGroupIndex !== -1 ? newItems[destinationGroupIndex].children : newItems;
                if (originGroupChildren && destinationGroupChildren) {
                    const movedItemIndex = originGroupChildren.findIndex((item) => item.id === movedItemId);
                    if (movedItemIndex !== -1) {
                        const [movedItem] = originGroupChildren.splice(movedItemIndex, 1);
                        destinationGroupChildren.splice(position, 0, movedItem);
                    }
                }
                return newItems;
            }
            const groupIndex = newItems.findIndex((item) => item.id === originId && item.type === "group");
            const groupChildren = groupIndex !== -1 ? newItems[groupIndex].children : newItems;
            if (!groupChildren) return newItems;
            const movedItemIndex = groupChildren.findIndex((item) => item.id === movedItemId);
            if (movedItemIndex !== -1) {
                groupChildren.splice(movedItemIndex, 1);
                groupChildren.splice(position, 0, { id: movedItemId, type: "item" });
            }
            return newItems;
        });
    }

    return (
        <div className="flex flex-col gap-4">
            <h2>Table</h2>
            <SortableList isMoveAllowed={() => true} onItemMoved={onMove}>
                <SortableList.ScrollContainer overlayMarginTop={20}>
                    <div className="max-h-[150px] overflow-auto">
                        <table className="w-full table-fixed border-collapse">
                            <SortableList.NoDropZone>
                                <thead className="sticky top-0 bg-white z-100">
                                    <tr>
                                        <th></th>
                                        <th>Name</th>
                                        <th>Test</th>
                                    </tr>
                                </thead>
                            </SortableList.NoDropZone>
                            <SortableList.Content>
                                <tbody>
                                    {items.map((item) => {
                                        if (item.type === "item") {
                                            return (
                                                <SortableList.Item key={item.id} id={item.id}>
                                                    <tr>
                                                        <td>
                                                            <SortableList.DragHandle>
                                                                <DragIndicator
                                                                    fontSize="inherit"
                                                                    className="pointer-events-none"
                                                                />
                                                            </SortableList.DragHandle>
                                                        </td>
                                                        <td>{item.id}</td>
                                                        <td>Test</td>
                                                    </tr>
                                                </SortableList.Item>
                                            );
                                        }
                                        if (item.type === "group") {
                                            return (
                                                <SortableList.Group key={item.id} id={item.id}>
                                                    <tr className="bg-gray-200">
                                                        <td colSpan={3} className="font-bold">
                                                            <table className="w-full">
                                                                <thead>
                                                                    <tr>
                                                                        <th>
                                                                            <SortableList.DragHandle>
                                                                                <DragIndicator
                                                                                    fontSize="inherit"
                                                                                    className="pointer-events-none"
                                                                                />
                                                                            </SortableList.DragHandle>
                                                                        </th>
                                                                        <th>Name</th>
                                                                        <th>Test</th>
                                                                    </tr>
                                                                </thead>
                                                                <SortableList.GroupContent>
                                                                    <tbody>
                                                                        {item.children &&
                                                                            item.children.map((child) => (
                                                                                <SortableList.Item
                                                                                    key={child.id}
                                                                                    id={child.id}
                                                                                >
                                                                                    <tr>
                                                                                        <td>
                                                                                            <SortableList.DragHandle>
                                                                                                <DragIndicator
                                                                                                    fontSize="inherit"
                                                                                                    className="pointer-events-none"
                                                                                                />
                                                                                            </SortableList.DragHandle>
                                                                                        </td>
                                                                                        <td>{child.id}</td>
                                                                                        <td>Test</td>
                                                                                    </tr>
                                                                                </SortableList.Item>
                                                                            ))}
                                                                    </tbody>
                                                                </SortableList.GroupContent>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </SortableList.Group>
                                            );
                                        }
                                    })}
                                </tbody>
                            </SortableList.Content>
                        </table>
                    </div>
                </SortableList.ScrollContainer>
            </SortableList>
            <h2>Divs</h2>
            <SortableList isMoveAllowed={() => true} onItemMoved={onMove}>
                <SortableList.Content>
                    <SortableList.ScrollContainer>
                        <div className="w-full h-32 overflow-auto">
                            {items.map((item) => {
                                if (item.type === "item") {
                                    return (
                                        <SortableList.Item key={item.id} id={item.id}>
                                            <div>
                                                <SortableList.DragHandle>
                                                    <DragIndicator fontSize="inherit" className="pointer-events-none" />
                                                </SortableList.DragHandle>
                                                <span className="flex-1">{item.id}</span>
                                            </div>
                                        </SortableList.Item>
                                    );
                                }
                                if (item.type === "group") {
                                    return (
                                        <SortableList.Group key={item.id} id={item.id}>
                                            <div className="bg-gray-200">
                                                <div className="flex gap-2">
                                                    <SortableList.DragHandle>
                                                        <DragIndicator
                                                            fontSize="inherit"
                                                            className="pointer-events-none"
                                                        />
                                                    </SortableList.DragHandle>
                                                    <span className="flex-1">{item.id}</span>
                                                </div>
                                                <SortableList.GroupContent>
                                                    <div>
                                                        {" "}
                                                        {item.children &&
                                                            item.children.map((child) => (
                                                                <SortableList.Item key={child.id} id={child.id}>
                                                                    <div>
                                                                        <SortableList.DragHandle>
                                                                            <DragIndicator
                                                                                fontSize="inherit"
                                                                                className="pointer-events-none"
                                                                            />
                                                                        </SortableList.DragHandle>
                                                                        <span className="flex-1">{child.id}</span>
                                                                    </div>
                                                                </SortableList.Item>
                                                            ))}
                                                    </div>
                                                </SortableList.GroupContent>
                                            </div>
                                        </SortableList.Group>
                                    );
                                }
                            })}
                        </div>
                    </SortableList.ScrollContainer>
                </SortableList.Content>
            </SortableList>
        </div>
    );

    /*
    return (
        <div ref={ref} className="w-full h-full">
            <Plot data={[data]} layout={layout} />
        </div>
    );
    */
}
