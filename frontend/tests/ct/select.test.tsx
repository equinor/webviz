import { Select, SelectOption } from "@lib/components/Select";
import { expect, test } from "@playwright/experimental-ct-react";

test.use({ viewport: { width: 1920, height: 1080 } });

const selectOptions1: SelectOption[] = [];
const selectOptions2: SelectOption[] = [];

for (let i = 0; i < 100; i++) {
    selectOptions1.push({ label: `Option ${i}`, value: i.toString() });
    if (i >= 50) {
        continue;
    }
    selectOptions2.push({ label: `Option ${i}`, value: i.toString() });
}

const SIZE = 10;

function arrayContainsOtherArray<T>(array: T[], otherArray: T[]): boolean {
    return otherArray.every((item) => array.includes(item));
}

test.describe("Select", () => {
    test("Options are shown properly", async ({ mount }) => {
        const select = await mount(<Select options={selectOptions1} size={SIZE} />);

        // Make sure our component is mounted
        await expect(select).toBeVisible();
        const firstDiv = select.locator("div").first();
        const secondDiv = firstDiv.locator("div").first();

        // Virtualization does always hold more elements than visible in the view, so we expect to have at least "size" visible elements
        expect((await secondDiv.locator("div").count()) > SIZE).toBeTruthy();
    });

    test("Single select is working", async ({ mount }) => {
        let selection: string[] = [];
        function handleChange(values: string[]) {
            selection = values;
        }

        const select = await mount(<Select options={selectOptions1} size={SIZE} onChange={handleChange} />);

        // Click on first element and expect selection
        let options = await select.locator("div").first().locator("div").first().locator("div");
        await options.first().click();
        expect(selection.includes(selectOptions1[0].value)).toBeTruthy();

        // Use keyboard to change selection
        await select.press("ArrowDown");
        expect(selection.includes(selectOptions1[1].value)).toBeTruthy();

        // Make sure SHIFT and CTRL are not working in single select mode
        await select.press("Shift+ArrowDown");
        expect(selection.includes(selectOptions1[2].value)).toBeTruthy();

        await select.press("Control+ArrowDown");
        expect(selection.includes(selectOptions1[3].value)).toBeTruthy();

        // Make sure Home is working
        await select.press("Home");
        expect(selection.includes(selectOptions1[0].value)).toBeTruthy();
        expect(select).toContainText(selectOptions1[0].value);

        // Make sure PageDown and PageUp are working
        await select.press("PageDown");
        expect(selection.includes(selectOptions1[SIZE].value)).toBeTruthy();
        expect(select).toContainText(selectOptions1[SIZE].value);

        await select.press("PageUp");
        expect(selection.includes(selectOptions1[0].value)).toBeTruthy();
        expect(select).toContainText(selectOptions1[0].value);

        // Make sure End is working
        await select.press("End");
        expect(selection.includes(selectOptions1[selectOptions1.length - 1].value)).toBeTruthy();
        expect(select).toContainText(selectOptions1[selectOptions1.length - 1].value);

        await select.press("Home");
        expect(selection.includes(selectOptions1[0].value)).toBeTruthy();
        expect(select).toContainText(selectOptions1[0].value);

        // Click on fourth element and expect selection
        options = await select.locator("div").first().locator("div").first().locator("div");
        await options.nth(3).click();
        expect(selection.includes(selectOptions1[3].value)).toBeTruthy();
    });

    test("Multi select is working", async ({ mount }) => {
        let selection: string[] = [];
        function handleChange(values: string[]) {
            selection = values;
        }

        const select = await mount(<Select options={selectOptions1} size={SIZE} onChange={handleChange} multiple />);

        // Click on first element and expect selection
        const options = select.locator("div").first().locator("div").first().locator("div");
        await options.first().click();
        expect(selection.includes(selectOptions1[0].value)).toBeTruthy();

        // Use keyboard to change selection
        await select.press("ArrowDown");
        expect(selection.includes(selectOptions1[1].value)).toBeTruthy();

        // Make sure SHIFT and CTRL are not working in single select mode
        await select.press("Shift+ArrowDown");
        expect(arrayContainsOtherArray(selection, [selectOptions1[1].value, selectOptions1[2].value])).toBeTruthy();

        await select.press("Shift+ArrowUp");
        expect(arrayContainsOtherArray(selection, [selectOptions1[1].value])).toBeTruthy();

        await select.press("Shift+ArrowUp");
        expect(arrayContainsOtherArray(selection, [selectOptions1[0].value, selectOptions1[1].value])).toBeTruthy();

        await select.press("Control+ArrowDown");
        await select.press("Control+ArrowDown");
        await select.press("Control+Space");
        expect(
            arrayContainsOtherArray(selection, [
                selectOptions1[0].value,
                selectOptions1[1].value,
                selectOptions1[2].value,
            ])
        ).toBeTruthy();

        // Make sure Home is working
        await select.press("Home");
        expect(selection.includes(selectOptions1[0].value)).toBeTruthy();
        expect(select).toContainText(selectOptions1[0].value);

        // Make sure PageDown and PageUp are working
        await select.press("PageDown");
        expect(selection.includes(selectOptions1[SIZE].value)).toBeTruthy();
        expect(select).toContainText(selectOptions1[SIZE].value);

        await select.press("PageUp");
        expect(selection.includes(selectOptions1[0].value)).toBeTruthy();
        expect(select).toContainText(selectOptions1[0].value);

        // Make sure End is working
        await select.press("End");
        expect(selection.includes(selectOptions1[selectOptions1.length - 1].value)).toBeTruthy();
        expect(select).toContainText(selectOptions1[selectOptions1.length - 1].value);

        await select.press("Home");
        expect(selection.includes(selectOptions1[0].value)).toBeTruthy();
        expect(select).toContainText(selectOptions1[0].value);

        // Make sure selections with PageDown are working
        await select.press("Shift+PageDown");
        const expectedSelection = selectOptions1.slice(0, SIZE).map((el) => el.value);
        expect(arrayContainsOtherArray(selection, expectedSelection)).toBeTruthy();
        for (let i = 0; i < expectedSelection.length; i++) {
            expect(select).toContainText(expectedSelection[i]);
        }

        // Reset selection and make sure PageUp is working
        await select.press("Home");
        expect(selection.includes(selectOptions1[0].value)).toBeTruthy();
        expect(select).toContainText(selectOptions1[0].value);

        await select.press("PageDown");
        expect(selection.includes(selectOptions1[SIZE].value)).toBeTruthy();
        expect(select).toContainText(selectOptions1[SIZE].value);

        await select.press("Shift+PageUp");
        expect(arrayContainsOtherArray(selection, expectedSelection)).toBeTruthy();
        for (let i = 0; i < expectedSelection.length; i++) {
            expect(select).toContainText(expectedSelection[i]);
        }

        // Reset and make sure End and Home are working
        await select.press("Home");
        expect(selection.includes(selectOptions1[0].value)).toBeTruthy();
        expect(select).toContainText(selectOptions1[0].value);

        await select.press("Shift+End");
        expect(
            arrayContainsOtherArray(
                selection,
                selectOptions1.map((el) => el.value)
            )
        ).toBeTruthy();
        for (let i = selectOptions1.length - SIZE; i < selectOptions1.length; i++) {
            expect(select).toContainText(selectOptions1[i].value);
        }

        await select.press("End");
        expect(selection.includes(selectOptions1[selectOptions1.length - 1].value)).toBeTruthy();
        expect(select).toContainText(selectOptions1[selectOptions1.length - 1].value);

        await select.press("Shift+Home");
        expect(
            arrayContainsOtherArray(
                selection,
                selectOptions1.map((el) => el.value)
            )
        ).toBeTruthy();
    });

    test("Changing props.options is working", async ({ mount }) => {
        let selection: string[] = [];
        function handleChange(values: string[]) {
            selection = values;
        }

        const select = await mount(<Select options={selectOptions1} size={SIZE} onChange={handleChange} multiple />);
        for (let i = 0; i < SIZE; i++) {
            expect(select).toContainText(selectOptions1[i].value);
        }

        await select.update(<Select options={selectOptions2} size={SIZE} onChange={handleChange} multiple />);
        for (let i = 0; i < SIZE; i++) {
            expect(select).toContainText(selectOptions2[i].value);
        }

        // Click on first element and expect selection
        const options = select.locator("div").first().locator("div").first().locator("div");
        await options.first().click();
        expect(selection.includes(selectOptions1[0].value)).toBeTruthy();

        await select.press("End");
        expect(selection.includes(selectOptions2[selectOptions2.length - 1].value)).toBeTruthy();
    });
});
