const eos_ecc = require('eosjs-ecc');

export class Account {
  public name: string;
  private _default_auth: string;
  public  public_key: string = '';
  public  private_key: string = '';
  public  isAccount: boolean;

  constructor(account_name: string) {
    this.name = account_name;
    this._default_auth = 'active';
    this.isAccount = true;
  }

  usePrivateKey(private_key: string) {
    if (!eos_ecc.isValidPrivate(private_key)) {
      throw new Error("Private key is invalid.");
    }
    this.private_key = private_key;
    this.public_key = eos_ecc.privateToPublic(private_key);
    return this;
  }

  setPublicKey(key: string) {
    this.public_key = key;
  }

  async register2(api: any) {
    await api.transact({
      actions: [{
        account: 'eosio',
        name: 'newaccount',
        authorization: [{
          actor: 'eosio',
          permission: 'active'
        }],
        data: {
          creator: 'eosio',
          name: this.name,
          owner: {
            threshold: 1,
            keys: [{
              key: this.public_key,
              weight: 1
            }],
            accounts: [],
            waits: []
          },
          active: {
            threshold: 1,
            keys: [{
              key: this.public_key,
              weight: 1
            }],
            accounts: [],
            waits: []
          },
        },
      }, {
        account: 'eosio.bios',
        name: 'setpriv',
        authorization: [{
          actor: 'eosio.bios',
          permission: 'active'
        }],
        data: {
          account_name: 'eosio.msig',
          uint8_t: 1
        },
      } //{
        /*account: 'eosio',
        name: 'delegatebw',
        authorization: [{
        actor: 'eosio',
          permission: 'owner'
        }],
        data: {
          from: 'eosio',
          receiver: this.name,
          stake_net_quantity: '10.0000 SYS',
          stake_cpu_quantity: '10.0000 SYS',
          transfer: 0
        },
     }*/]
    }, {
      blocksBehind: 3,
      expireSeconds: 60,
    });
  }
  
  async register(api: any) {
    try {
      await api.transact({
        actions: [{
          account: 'eosio',
          name: 'newaccount',
          authorization: [{
            actor: 'eosio',
            permission: 'active'
          }],
          data: {
            creator: 'eosio',
            name: this.name,
            owner: {
              threshold: 1,
              keys: [{
                key: this.public_key,
                weight: 1
              }],
              accounts: [],
              waits: []
            },
            active: {
              threshold: 1,
              keys: [{
                key: this.public_key,
                weight: 1
              }],
              accounts: [],
              waits: []
            },
          },
        } /*{
          account: 'eosio.bios',
          name: 'setpriv',
          authorization: [{
            actor: 'eosio',
            permission: 'active'
          }],
          data: {
            account_name: 'eosio.msig',
            uint8_t: 1
          },
        } //{
          /*account: 'eosio',
          name: 'delegatebw',
          authorization: [{
          actor: 'eosio',
            permission: 'owner'
          }],
          data: {
            from: 'eosio',
            receiver: this.name,
            stake_net_quantity: '10.0000 SYS',
            stake_cpu_quantity: '10.0000 SYS',
            transfer: 0
          },
       }*/]
      }, {
        blocksBehind: 3,
        expireSeconds: 60,
      });
    } catch(err) {console.log('register:', err)}
    
  }

  get default_auth() {
      return this._default_auth;
  }

  set default_auth(value) {
    this._default_auth = value;
  }
}