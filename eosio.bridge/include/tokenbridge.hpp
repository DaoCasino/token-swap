// DAO.Casino 
// Token bridge

#pragma once

#include <eosio/eosio.hpp>
#include <eosio/system.hpp>
#include <eosio/asset.hpp>
#include <eosio/transaction.hpp>
#include <eosio/producer_schedule.hpp>

using namespace std;
using namespace eosio;
 
// MARK: - Secondary key names
#define transaction_hash_key_n eosio::name("transacthash")
#define proposal_key_n eosio::name("proposal")
#define proposer_key_n eosio::name("proposer")

CONTRACT tokenbridge : public contract {
public:
	// MARK: - Public actions
	tokenbridge(name receiver, name code, datastream<const char*> ds);

	ACTION version();
	ACTION droptables();
	ACTION addproposal(const checksum256& transaction_hash, const name& proposer, const name& proposal_name);  
	ACTION transfer(const checksum256& transaction_hash, const name& proposal_name, const name& to, const asset& amount);

	/// Manual action. A transaction may not be deleted automatically if the deferred transaction (rmproposal) and transfer action do not work at the same time.
	ACTION rmoldpropos(const name& proposer);

	/// Only contract can delete proposal from proposals table
	ACTION rmproposal(const uint64_t& key);
	
private:
	// MARK: - Table type defines
	TABLE Proposal {
		uint64_t key;

		name proposer;
		name proposal_name;
		time_point timestamp; 

		uint64_t primary_key() const { return key; }
		uint64_t get_by_proposal() const { return proposal_name.value; }
		uint64_t get_by_proposer() const { return proposer.value; }
	};
	
	TABLE Transaction {
		uint64_t key;

		checksum256 transaction_hash;

		uint64_t primary_key() const { return key; }
		checksum256 get_by_transaction_hash() const { return transaction_hash; }
	};

	typedef multi_index<name("proposals"), Proposal,
  			indexed_by<proposal_key_n, const_mem_fun<Proposal, uint64_t, &Proposal::get_by_proposal>>,
			indexed_by<proposer_key_n, const_mem_fun<Proposal, uint64_t, &Proposal::get_by_proposer>>> proposals_table_t;
            
	typedef multi_index<name("transactions"), Transaction, 
            indexed_by<transaction_hash_key_n, const_mem_fun<Transaction, checksum256, &Transaction::get_by_transaction_hash>>> transactions_table_t;

	// MARK: - Constants
	const uint32_t proposed_max_proposals = 15;
	const uint32_t delay_to_proposal_autoremove_s = 600; // 10 min

	// MARK: - Table instanses
	transactions_table_t transactions;
	proposals_table_t proposals;
						
	// MARK: - Private methods
	inline void check_is_active_producer(const name& producer);
	inline time_point current_autoremove_time_point();
	inline void deferred_remove_proposal(const uint64_t& key);
	inline void remove_all_proposals_by(const name& proposal_name);
	inline void save_transaction_info(const checksum256& transaction_hash);
};
