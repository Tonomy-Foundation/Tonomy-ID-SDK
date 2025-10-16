import { PrivateKey } from '@wharfkit/antelope';
import { EosioUtil } from '../../sdk';
import deployContract from '../bootstrap/deploy-contract';

export default async function contracts(args: string[]) {
    if (args[0] === 'deploy') {
        const account = 'tonomy';
        const signer = [
            EosioUtil.createSigner(PrivateKey.from('')), // ops.tmy
            EosioUtil.createSigner(PrivateKey.from('')), // 1.found.tmy
            EosioUtil.createSigner(PrivateKey.from('')), // 2.found.tmy
        ];

        await deployContract(
            {
                account,
            },
            signer,
            {
                throughTonomyProxy: true,
            }
        );
    } else {
        throw new Error(`Unknown command ${args[0]}`);
    }
}
