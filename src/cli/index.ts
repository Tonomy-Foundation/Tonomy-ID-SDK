import apps from './apps';
import keys from './keys';
import authority from './authority';
import bootstrap from './bootstrap';
import msig from './msig';
import accounts from './accounts';
import vesting from './vesting';

const args: string[] = process.argv.slice(2);

async function main() {
    console.log('Arguments: ', args);

    if (args[0] === 'apps') {
        await apps(args.slice(1));
    } else if (args[0] === 'accounts') {
        await accounts(args.slice(1));
    } else if (args[0] === 'vesting') {
        await vesting(args.slice(1));
    } else if (args[0] === 'keys') {
        await keys(args.slice(1));
    } else if (args[0] === 'authority') {
        await authority(args.slice(1));
    } else if (args[0] === 'bootstrap') {
        await bootstrap();
    } else if (args[0] === 'msig') {
        await msig(args.slice(1));
    } else {
        console.log(`
Usage:
    yarn run cli [commands]
    
    Commands:
        apps create appName usernamePrefix description logoUrl origin publicKey
        accounts get username
        keys create
        keys convert publicKey
        authority publicKey/privateKey
        authority account1 [account2] [account3] [accountN]
        bootstrap privateKey
        msig cancel proposalName
        msig propose gov-migrate proposalName
        msig propose new-account proposalName
        msig propose transfer proposalName
        msig propose ... --test
        msig exec proposalName
`);
    }
}

Promise.resolve(main()).catch((err) => {
    console.error(err);
    process.exit(1);
});
