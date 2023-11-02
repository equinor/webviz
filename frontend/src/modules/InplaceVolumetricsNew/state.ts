export type SubModule = {
    id: string;
    relX: number;
    relY: number;
    relWidth: number;
    relHeight: number;
};

export type State = {
    subModules: SubModule[];
};
