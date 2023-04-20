import { APIClient } from '@greymass/eosio';
import { GetInfoResponse } from '@greymass/eosio/src/api/v1/types';
export declare function getApi(): Promise<APIClient>;
export declare function getChainInfo(): Promise<GetInfoResponse>;
