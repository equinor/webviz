export function makeInitials(name: string): string | null {
    const regExp = new RegExp(/([^()]+)(\([\w ]+\))/);
    const match = regExp.exec(name);

    if (match) {
        const names = match[1].trim().split(" ");
        if (names.length > 1) {
            return names[0].charAt(0) + names[names.length - 1].charAt(0);
        }
    }
    return null;
}