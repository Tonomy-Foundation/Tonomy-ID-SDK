import { setTestSettings } from './helpers/settings';
import { TextEncoder, TextDecoder } from 'util';

// Object.assign(global, { TextDecoder, TextEncoder });
global.TextEncoder = TextEncoder;
// @ts-expect-error TextDecoder bs...
global.TextDecoder = TextDecoder;

setTestSettings();
