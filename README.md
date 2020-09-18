# Token swap

Oracle service for DAOBet validators.

## Configure

in ```conf.json``` file **Configure next fields:** 

 - ```accountName``` : paste your account name
 - ```KeyProvider``` : paste your account private key
 - ```ethNet```      : paste your infura id project
 
 > **For getting the infura `project id` you have to register on [infura.io](infura.io) and create a project**

## Run

using docker:
```sh
docker pull daocasino/oracle
docker run -d -v PATH_TO_CONFIG_IN_HOST_MACHINE:/app/conf.json daocasino/oracle
```

using nodejs:
```sh
npm install
npm run prod
node build/oracle.js
```

## How it works?

### Workflow

1. User call ```convert(...)``` on smart contract in ethereum mainnet
2. Smart contract in ethereum while transfering BET tokens from users, and emit event **Swap**
3. Oracle reads events from ethereum smart contract and proposes to ```eosio.msig``` transfer BET tokens from ```eosio.bridge``` to account from events.  if this proposal already exists, oracle approves this proposal.
4. When proposal has been approved by 2/3 + 1 validators ```eosio.bridge``` sends tokens to user.
