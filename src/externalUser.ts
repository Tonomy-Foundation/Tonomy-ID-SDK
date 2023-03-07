import { userInfo } from "os";
import { KeyManager } from "./services/keymanager";
import { JsKeyManager } from "../test/services/jskeymanager";

class ExternalUser {
  static async loginWithTonomy(): Promise<void> {
    /**
     * contains logic about logging in to tonomy
     * when button is pressed 
     */
  }

  /**
   * 
   * @param [keymanager=JSKEymanager] 
   * @throws if user doesn't exists, keys are missing or user not loggedIn
   * @returns the external user object
   */
  static getUser(keymanager = JSsKeymanager: KeyManager): Promise<ExternalUser> {
    /**
     * checks storage for keys and other metadata 
     * fethces user from blockchain
     * checks if user is loggedin by verifying the keys
     * delete the keys from storage if they are not verified 
     * returns the user object
     */
    return Object.assign(this, {})
  }

  /**
   * 
   * @param keymanager 
   * @throws error if user didn't login correctly
   * @returns external user objects
   */
  static verifyLogin(keymanager = JSsKeymanager: KeyManager, storage = jsStorage: Storage):  Promise<ExternalUser>  {
    userApps.callBack(keymanager);
    return Object.assign(this, {})
  }
}