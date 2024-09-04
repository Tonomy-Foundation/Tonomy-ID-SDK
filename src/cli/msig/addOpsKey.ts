import { Name } from '@wharfkit/antelope';
import { generateRandomKeyPair, getAccountInfo } from '../../sdk';
import { ActionData, Authority } from '../../sdk/services/blockchain';

export default async function addOpsNewKey() {
    console.log('Creating new key\n');

    // Generate a new key pair
    const keyPair = generateRandomKeyPair();

    console.log('Public key: ', keyPair.publicKey.toString());
    console.log('Private key: ', keyPair.privateKey.toString());

    // Fetch account information for ops.tmy
    const accountInfo = await getAccountInfo(Name.from('ops.tmy'));
    const activePermission = accountInfo.getPermission('active');

    const activeAuthority = Authority.fromAccountPermission(activePermission);

    activeAuthority.addKey(keyPair.publicKey.toString(), 1);

    // Create the ActionData for the updateauth action
    const action: ActionData = {
        account: 'tonomy',
        name: 'updateauth',
        authorization: [
            {
                actor: 'ops.tmy',
                permission: 'active',
            },
            {
                actor: 'tonomy',
                permission: 'active',
            },
            {
                actor: 'tonomy',
                permission: 'owner',
            },
        ],
        data: {
            account: 'ops.tmy',
            permission: 'active',
            parent: 'owner',
            auth: activeAuthority,
            // eslint-disable-next-line camelcase
            auth_parent: false,
        },
    };

    return action;
}
