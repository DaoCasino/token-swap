// DAO.Casino
// Token bridge

#include <tokenbridge.hpp>

tokenbridge::tokenbridge(name receiver, name code, datastream<const char *> ds) : eosio::contract(receiver, code, ds), transactions(receiver, receiver.value), proposals(receiver, receiver.value)
{
}

ACTION tokenbridge::version()
{
	print("DAO.Casino - Token bridge - version 0.1.1.");
};

ACTION tokenbridge::droptables()
{
	require_auth(get_self());
	for (auto itr = proposals.begin(); itr != proposals.end();)
	{
		cancel_deferred(itr->key);
		itr = this->proposals.erase(itr);
	}
	for (auto itr = transactions.begin(); itr != transactions.end();)
	{
		itr = this->transactions.erase(itr);
	}
}

ACTION tokenbridge::addproposal(const checksum256 &transaction_hash, const name &proposer, const name &proposal_name)
{
	require_auth(proposer);
	check_is_active_producer(proposer);

	auto proposers_index = this->proposals.get_index<proposer_key_n>();
	auto distance = std::distance(proposers_index.lower_bound(proposer.value), proposers_index.upper_bound(proposer.value));
	check(distance < proposed_max_proposals, "Offer limit reached for proposer");

	auto transactions_index = this->transactions.get_index<transaction_hash_key_n>();
	auto find_item = transactions_index.find(transaction_hash);
	check(find_item == transactions_index.end(), "Transaction for this hash already complite.");

	auto proposal_name_index = this->proposals.get_index<proposal_key_n>();
	auto lower_bound = proposal_name_index.lower_bound(proposal_name.value);
	auto upper_bound = proposal_name_index.upper_bound(proposal_name.value);

	time_point timestamp_lower_bound = current_autoremove_time_point();
	for (auto iterator = lower_bound; iterator != upper_bound; ++iterator)
	{
		bool is_exist = (iterator->proposal_name == proposal_name) && (iterator->timestamp > timestamp_lower_bound);
		check(!is_exist, "Proposal already exist.");
	}

	uint64_t key = this->proposals.available_primary_key();
	this->proposals.emplace(get_self(), [&](auto &element) {
		element.key = key;
		element.proposer = proposer;
		element.proposal_name = proposal_name;
		element.timestamp = current_time_point();
	});
	print("Proposal saved.");

	deferred_remove_proposal(key);
}

ACTION tokenbridge::transfer(const checksum256 &transaction_hash, const name &proposal_name, const name &to, const asset &amount)
{
	require_auth(permission_level(name("eosio.prods"), name("active")));

	save_transaction_info(transaction_hash); // add transact to list, fail if already exist.

	action(
		permission_level(get_self(), name("active")),
		name("eosio.token"), name("transfer"),
		make_tuple(get_self(), to, amount, string("")))
		.send(); // Send tokens

	remove_all_proposals_by(proposal_name); // Canceling deferred and removing transactions for this hash.
}

ACTION tokenbridge::rmoldpropos(const name &proposer)
{
	require_auth(proposer);

	auto index = this->proposals.get_index<proposer_key_n>();
	auto lower_bound = index.lower_bound(proposer.value);
	auto upper_bound = index.upper_bound(proposer.value);

	time_point timestamp_lower_bound = current_autoremove_time_point();
	while (lower_bound != upper_bound)
	{
		if (lower_bound->timestamp < timestamp_lower_bound)
		{
			cancel_deferred(lower_bound->key);
			lower_bound = index.erase(lower_bound);
		}
		else
		{
			lower_bound = next(lower_bound);
		}
	}
}

ACTION tokenbridge::rmproposal(const uint64_t &key)
{
	require_auth(get_self());
	auto iterator = this->proposals.find(key);
	this->proposals.erase(iterator);
}

inline void tokenbridge::check_is_active_producer(const name &user)
{
	vector<name> producers = get_active_producers();
	for (name producer : producers)
	{
		if (producer == user)
			return;
	}
	check(false, "This user not active block producer");
}

inline time_point tokenbridge::current_autoremove_time_point()
{
	microseconds delay_to_proposal_autoremove_us(int64_t(this->delay_to_proposal_autoremove_s) * 1000000);
	return current_time_point() - delay_to_proposal_autoremove_us;
}

inline void tokenbridge::deferred_remove_proposal(const uint64_t &key)
{
	transaction deferred{};
	deferred.actions.emplace_back(
		permission_level(get_self(), name("active")),
		get_self(), name("rmproposal"),
		make_tuple(key));
	deferred.delay_sec = delay_to_proposal_autoremove_s;
	deferred.send(key, get_self()); // key unic for each delete operation
	print("Proposal auto remove after", delay_to_proposal_autoremove_s, "seconds.");
}

inline void tokenbridge::remove_all_proposals_by(const name &proposal_name)
{
	auto index = this->proposals.get_index<proposal_key_n>();
	auto find_item = index.find(proposal_name.value);
	while (find_item != index.end())
	{
		cancel_deferred(find_item->key);
		index.erase(find_item);
		find_item = index.find(proposal_name.value);
	}
	print("proposals deleted.");
}

inline void tokenbridge::save_transaction_info(const checksum256 &transaction_hash)
{
	auto index = this->transactions.get_index<transaction_hash_key_n>();
	auto find_item = index.find(transaction_hash);

	check(find_item == index.end(), "Transaction already exist.");

	this->transactions.emplace(get_self(), [&](auto &element) {
		if (this->transactions.begin() == this->transactions.end())
			element.key = 0;
		else
			element.key = prev(this->transactions.end())->key + 1; // strict key orders: from smaller to larger
		element.transaction_hash = transaction_hash;
	});
	print("Transaction saved.");
}

EOSIO_DISPATCH(tokenbridge, (version)(droptables)(addproposal)(transfer)(rmoldpropos)(rmproposal))