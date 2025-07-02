import type { ButtonProps } from "@lib/components/Button/button";

export type ConfirmAction<T = string> = {
    id: T;
    label: string;
    color?: ButtonProps["color"];
};

export type ConfirmOptions<T = string> = {
    title: string;
    message: string;
    actions: ConfirmAction<T>[];
};

export class ConfirmationService<T = string> {
    private _resolver: ((result: T) => void) | null = null;
    private _showDialogCallback: ((options: ConfirmOptions<T>) => void) | null = null;

    setShowDialogCallback(callback: (options: ConfirmOptions<T>) => void) {
        this._showDialogCallback = callback;
    }

    confirm(options: ConfirmOptions<T>): Promise<T> {
        if (!this._showDialogCallback) {
            throw new Error("ConfirmationService: Show dialog callback is not set.");
        }

        return new Promise<T>((resolve) => {
            this._resolver = resolve;
            this._showDialogCallback!(options);
        });
    }

    resolve(result: T): void {
        this._resolver?.(result);
        this._resolver = null; // Reset resolver after resolving
    }
}

// Making a singleton instance of ConfirmationService
export const confirmationService = new ConfirmationService();
