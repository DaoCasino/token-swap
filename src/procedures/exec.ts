import {execTransfer} from '../shared/preparedTransaction'
import {Oracle} from '../oracle';
import {ApprovalWithCustomProposalInfo} from '../types';

export async function doExecs(self: Oracle,  approvalsWithProposalInfo: ApprovalWithCustomProposalInfo[]): Promise<string[]> {
  return Promise.all(getExecs(approvalsWithProposalInfo, self));
}

/**
 * 
 * @param approvalsWithProposalInfo - структура approval+proposer
 * @param self - оракл
 * отбирает аппрувалы с необходимым threshold (self.threshold - запрашивается при каждом цикле)
 * производит exec
 */
function getExecs(approvalsWithProposalInfo: ApprovalWithCustomProposalInfo[], self: Oracle): Promise<string>[] {
  return approvalsWithProposalInfo.reduce((approved: Promise<string>[], wrappedApproval: ApprovalWithCustomProposalInfo) => {
    if(wrappedApproval.approval && wrappedApproval.approval.provided_approvals && wrappedApproval.approval.provided_approvals.length >= self.threshold) {
      approved.push(wrappedExecTransferApproval(wrappedApproval, self));
    }
    return approved;
  }, []);
}

async function wrappedExecTransferApproval(approval: ApprovalWithCustomProposalInfo, self: Oracle): Promise<string> {
  const {proposer, proposal_name} = approval; 
  const {accountName, eosApi} = self;
  try {
    await execTransfer(proposer, accountName, proposal_name, eosApi)
    return `Executed: ${proposal_name}.`;
  } catch(err) {return `exec: ${err.json ? err.json.error.details[0].message : err}`;} 
}