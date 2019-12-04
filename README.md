# Token swap

Oracle service for DAOBet validators.

## Configure

in ```conf.json``` file **Configure next fields:** 

 - ```accountName``` : paste your account name
 - ```KeyProvider``` : paste your account private key

## Run

using docker:

```sh
docker build -t oracle .
docker run oracle
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