export function loadConfigurationFromLocalStorage(id: string): number[] | undefined {
    const configuration = localStorage.getItem(`resizable-settings-panels-${id}`);
    if (configuration) {
        return JSON.parse(configuration);
    }
    return undefined;
}

export function storeConfigurationInLocalStorage(id: string, sizes: number[]) {
    localStorage.setItem(`resizable-settings-panels-${id}`, JSON.stringify(sizes));
}
