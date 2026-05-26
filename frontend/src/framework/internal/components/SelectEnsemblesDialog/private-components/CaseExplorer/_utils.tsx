export function storeStateInLocalStorage(stateName: string, value: string) {
    localStorage.setItem(stateName, value);
}

export function readInitialStateFromLocalStorage(stateName: string): string {
    const storedState = localStorage.getItem(stateName);
    if (storedState && typeof storedState === "string") {
        return storedState;
    }
    return "";
}
