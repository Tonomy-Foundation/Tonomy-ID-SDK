export function modifyTonomyButton() {
    console.log('modifyTonomyButton() called');

    const tonomyButton = document.getElementsByClassName('tonomy-login-button');

    console.log('tonomyButton: ', tonomyButton);
    if (!tonomyButton || tonomyButton.length === 0) throw new Error('tonomyButton not found');
    const button = tonomyButton[0] as HTMLButtonElement;

    if (!button) throw new Error('button not found');
}
