import {
    ToastManagerAddOptions as ToastManagerAddOptionsBase,
    ToastManager as ToastManagerBase,
    Toast as ToastBase,
    ToastManagerUpdateOptions as ToastManagerUpdateOptionsBase,
    UseToastManagerReturnValue as UseToastManagerReturnValueBase,
    ToastObject as ToastObjectBase,
} from "@base-ui/react";

export function createToastManager<Data extends object = any>(): ToastManager<Data> {
    return ToastBase.createToastManager<Data>();
}

export function useToastManager<Data extends object = any>(): UseToastManagerReturnValue<Data> {
    return ToastBase.useToastManager<Data>() as UseToastManagerReturnValue<Data>;
}

export type ToastObject<Data extends object = any> = Omit<ToastObjectBase<Data>, "type"> & {
    type?: ToastType;
};

export type UseToastManagerReturnValue<Data extends object = any> = Omit<
    UseToastManagerReturnValueBase<Data>,
    "add" | "update" | "toasts"
> & {
    toasts: ToastObject[];
    add: <T extends Data = Data>(options: ToastManagerAddOptions<T>) => string;
    update: <T extends Data = Data>(toastId: string, options: ToastManagerUpdateOptions<T>) => void;
};

export type ToastType = "default" | "success" | "error" | "warning" | "info";

export interface ToastManagerAddOptions<Data extends object = any> extends Omit<
    ToastManagerAddOptionsBase<Data>,
    "type"
> {
    type?: ToastType | undefined;
}

export type ToastManagerUpdateOptions<Data extends object = any> = Omit<ToastManagerUpdateOptionsBase<Data>, "type"> &
    Pick<ToastManagerAddOptions<Data>, "type">;

export type ToastManager<Data extends object = any> = Omit<ToastManagerBase<Data>, "add" | "update"> & {
    add: <T extends Data = Data>(options: ToastManagerAddOptions<T>) => string;
    update: <T extends Data = Data>(id: string, updates: ToastManagerUpdateOptions<T>) => void;
};
