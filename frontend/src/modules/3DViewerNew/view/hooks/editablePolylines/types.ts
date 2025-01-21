import React from "react";

export type Polyline = {
    id: string;
    name: string;
    color: [number, number, number, number];
    path: number[][];
};

export type ContextMenuItem = {
    icon?: React.ReactNode;
    label: string;
    onClick: () => void;
};
