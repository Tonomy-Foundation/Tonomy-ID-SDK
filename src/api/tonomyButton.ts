
/**
 * Find the Tonomy button in the DOM and update the styles
 * 
 * @throws {Error} If the button is not found
 */
export function modifyTonomyButton() {
    const tonomyButton = document.getElementsByClassName('tonomy-login-button');

    if (!tonomyButton || tonomyButton.length === 0) throw new Error('element with class tonomy-login-button not found');
    const button = tonomyButton[0] as HTMLButtonElement;

    if (!button) throw new Error('Button not found');

    button.style.backgroundColor = 'red';
    button.style.color = "white"
    button.style.backgroundColor = "#67D7ED";
    button.style.borderRadius = "1.5rem";
    button.style.padding = ".5rem 2.5rem";
    button.style.borderColor = "transparent";
    button.style.fontSize = "1rem";
    button.style.boxShadow = "rgba(0, 0, 0, 0.288) 1px 1px 10px";
    button.style.fontWeight = "500";
    button.style.cursor = "pointer";
    button.style.transition = "all .5s ease"
}
