
import { User, JsAuthenticator } from '../src/index';

const auth = new JsAuthenticator();
const user = new User(auth);

// test('function is defined', () => {

//   expect(user.savePassword).toBeDefined();
// });

test('1+1 = 2', () => {

  expect(1 + 1).toBe(2)
})

