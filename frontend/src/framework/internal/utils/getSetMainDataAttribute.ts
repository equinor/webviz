export function getMainDataAttribute(attributeName: string) {
    const htmlElement = document.querySelector<HTMLHtmlElement>("html");
    console.debug(htmlElement?.getAttribute(`data-${attributeName}`));
    return htmlElement ? htmlElement.getAttribute(`data-${attributeName}`) : null;
}

export function setMainDataAttribute(attributeName: string, value: string) {
    const htmlElement = document.querySelector<HTMLHtmlElement>("html");
    if (htmlElement) {
        htmlElement.setAttribute(`data-${attributeName}`, value);
    }
}
