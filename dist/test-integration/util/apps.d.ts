import { Name } from '@greymass/eosio';
import { TonomyUsername } from '../../src/index';
export declare function createRandomApp(logo_url?: string, origin?: string): Promise<{
    name: string;
    description: string;
    username: TonomyUsername;
    logo_url: string;
    origin: string;
    accountName: Name;
}>;
