import apps from './apps/apps';
import keys from './keys/index';
import bootstrap from './bootstrap/bootstrap';

const args: string[] = process.argv.slice(2);

async function main() {
    console.log('Arguments: ', args);

    if (args[0] === 'apps') {
        await apps(args.slice(1));
    } else if (args[0] === 'keys') {
        await keys(args.slice(1));
    } else if (args[0] === 'bootstrap') {
        await bootstrap();
    } else {
        console.log(`
Usage:
    yarn run cli [commands]
    
    Commands:
        apps create appName usernamePrefix description logoUrl origin publicKey blockchainUrl
        keys create
        bootstrap
`);
    }
}

Promise.resolve(main()).catch((err) => {
    console.error(err);
    process.exit(1);
});
