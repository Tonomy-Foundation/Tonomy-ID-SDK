// import { JsKeyManager } from '../../test/services/jskeymanager';
// import { UserApps } from '../userApps';
// import { KeyManager } from './keymanager';

const element = document.getElementById('tonomy-login');
const button = document.createElement('button');

button.innerText = 'Login With Tonomy';

element.append(button);

button.onclick = () => {
    alert('fine');
    // UserApps.onPressLogin({ callbackPath: '/callback' }, new JsKeyManager() as unknown as KeyManager);
};
