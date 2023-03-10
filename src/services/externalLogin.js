// import { JsKeyManager } from '../../test/services/jskeymanager';
// import { UserApps } from '../userApps';
// import { KeyManager } from './keymanager';

const element = document.getElementById('tonomy-login');
const button = document.createElement('button');

button.style.boxShadow =
    '12px 23px 10px rgba(0, 0, 0, 0.01), 6px 13px 9px rgba(0, 0, 0, 0.05), 3px 6px 7px rgba(0, 0, 0, 0.09), 1px 1px 4px rgba(0, 0, 0, 0.1), 0px 0px 0px rgba(0, 0, 0, 0.1)';
button.style.backgroundImage =
    'url(https://raw.githubusercontent.com/Tonomy-Foundation/Tonomy-ID-SSO-Website/master/src/assets/tonomy/tonomy-logo48.png)';
button.style.textAlign = 'center';
button.style.backgroundSize = '30px';
button.style.padding = '15px 20px 20px 50px';
button.style.backgroundPosition = '8px 8px';
button.style.backgroundRepeat = 'no-repeat';

button.style.backgroundColor = '#67D7ED';
button.style.borderRadius = '20px';

button.style.color = '#FFFFFF';
button.style.fontWeight = '800';
button.style.border = '0px';
button.innerText = 'Login With Tonomy';

button.onclick = () => {
    alert('fine');
    // UserApps.onPressLogin({ callbackPath: '/callback' }, new JsKeyManager() as unknown as KeyManager);
};

element.append(button);
