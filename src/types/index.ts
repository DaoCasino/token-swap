import { EventLog } from 'web3/types';
import {Oracle} from '../oracle';

export interface CustomProposals {
    key: number,
    timestamp: number | string;
    proposer: string,
    proposal_name: string,
}

export interface CustomTransaction {
   key: number;
   transaction_hash: string;
}

export interface BridgeData {
   transactionHash: string;
   blockNumber: number;
   logIndex: number;
   eosAccName: string;
   amount: string;
}

export interface ApprovalWithCustomProposalInfo {
    proposal_name: string;
    approval: undefined | Approval;
    proposer: string;
} 

 export interface Approval {
    proposal_name: string;
    requested_approvals: ApprovalItem[];
    provided_approvals: ApprovalItem[];
 }

 export interface ApprovalWithProposer extends Approval {
   proposer: string;
}

 export interface Proposal {
    proposal_name: string;
    packed_transaction: string;
 }

 export interface ApprovalItem {
    level: {actor: string, permission: string}
 }

 export interface CustomTransferProposal {
   proposer: string;
   name: string;
   amount: string;
   transactionHash: string;
   self: Oracle;
   uniqueName: string;
 }

 export interface MsigTransferProposal extends CustomTransferProposal{
   requested: AccountPermission[];
   time: number;
 }


 export interface ValidationInfo {
    proposal: ProposedTransaction;
    proposal_name: string;
    transactionHash: string;
    proposer: string;
    proposal_hash: string;
 }

 export interface ValidationInfoWithEthEvent extends ValidationInfo{
   ethValues: EventLog[];
 }

 export interface ProposedTransaction {
    expiration: string;
    ref_block_num: number;
    ref_block_prefix: number;
    max_net_usage_words: number;
    max_cpu_usage_ms: number;
    delay_sec: number;
    context_free_actions: any[];
    actions: any[];
    transaction_extensions: any[]; 
}

export interface EventWithUniqueProposalName
{
   transactionHash: string;
   blockNumber: number;
   name: string;
   amount: string;
   uniqueName: string;
}

export interface AccountPermission {
   actor: string;
   permission: string
}

export interface Account {
   permission: AccountPermission;
   weight: number;
}
export interface Permission {
   perm_name: string;
   parent: string;
   required_auth: {
      threshold: number;
      keys: string[];
      accounts:  Account[];
   }
}

export interface BridgeReturnData {
   alreadyProposed: CustomProposals[];
   eventsToPropose: BridgeData[];
   retProposals: string[];
   retApproves: string[];
   retCancels: string[];
   retExecs: string[];
   [key: string]: string[] | CustomProposals[] | BridgeData[];
}
