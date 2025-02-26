import apps from './apps';
import keys from './keys';
import authority from './authority';
import bootstrap from './bootstrap';
import msig from './msig';
import accounts from './accounts';
import vesting from './vesting';
import { audit, transfer } from './token';
import { setSettings } from '../sdk';
import settings from './settings';

const args: string[] = process.argv.slice(2);

setSettings(settings.config);
console.log('Using environment', settings.env);

async function main() {
    console.log('Arguments: ', args);

    if (args[0] === 'apps') {
        await apps(args.slice(1));
    } else if (args[0] === 'accounts') {
        await accounts(args.slice(1));
    } else if (args[0] === 'authority') {
        await authority(args.slice(1));
    } else if (args[0] === 'bootstrap') {
        await bootstrap();
    } else if (args[0] === 'keys') {
        await keys(args.slice(1));
    } else if (args[0] === 'msig') {
        await msig(args.slice(1));
    } else if (args[0] === 'vesting') {
        await vesting(args.slice(1));
    } else if (args[0] === 'token') {
        if (args[1] === 'transfer') {
            await transfer(args.slice(1));
        } else if (args[1] === 'audit') {
            await audit();
        } else {
            printCliHelp();
        }
    } else {
        printCliHelp();
    }
}

export function printCliHelp() {
    console.log(`
        Usage:
            yarn run cli [commands]
            
            Commands:
                accounts get <username>
                apps create <appName> <usernamePrefix> <description> <logoUrl> <origin> <publicKey>
                authority <publicKey/privateKey>
                authority <account1> <account2> ... <accountN>
                bootstrap
                keys create
                keys convert <publicKey/privateKey>
                msig [commands]
                vesting assign <sender> <username/accountName> <amount> <category>
                vesting audit
                vesting setsettings
                token transfer <from> <username/accountName> <amount> <memo>
                token audit
        `);
}

Promise.resolve(main()).catch((err) => {
    console.error(err);
    process.exit(1);
});
