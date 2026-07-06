export function getMainDataAttribute(attributeName: string) {
    const htmlElement = document.querySelector<HTMLHtmlElement>("html");
    return htmlElement ? htmlElement.getAttribute(`data-${attributeName}`) : null;
}

export function setMainDataAttribute(attributeName: string, value: string) {
    const htmlElement = document.querySelector<HTMLHtmlElement>("html");
    if (htmlElement) {
        htmlElement.setAttribute(`data-${attributeName}`, value);
    }
}
