import { ExternalUser } from './externalUser';
import { setSettings } from '../sdk';
import { modifyTonomyButton } from './tonomyButton';

try {
    modifyTonomyButton();
} catch (error) {
    console.error('error: ', error);
}

export const api = {
    ExternalUser,
    setSettings,
    modifyTonomyButton,
};
