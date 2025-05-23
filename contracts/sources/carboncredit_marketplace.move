#[allow(unused_use)]
module 0x0::carbon_marketplace {
    use std::string::{Self, String};
    use sui::table::{Self, Table};
    use sui::vec_map::{Self, VecMap};
    use sui::clock::{Self, Clock};


    public fun get_current_timestamp(clock: &Clock): u64 {
        clock.timestamp_ms()
    }

    public struct OrganisationHandler has key {
        id: UID,
        organisations: VecMap<ID, Organisation>,
        wallet_addressToOrg: VecMap<address, ID>,
    }
    
    public struct Organisation has key, store {
        id: UID,
        name: String,
        wallet_address: address,
        description: String,
        owner: address,
        carbon_credits: u64,
        times_lent: u64,
        total_lent: u64,
        times_borrowed: u64,
        total_borrowed: u64,
        total_returned: u64,
        times_returned: u64,
        emissions: u64,
        reputation_score: u64,
    }
    
    public struct OrganisationCreated has copy, drop {
        organisation_id: ID,
        name: String,
        owner: address
    }
    
    public struct OrganisationUpdated has copy, drop {
        organisation_id: ID,
        name: String,
        description: String
    }
    
    fun init(ctx: &mut TxContext) {
        transfer::share_object(
            OrganisationHandler {
                id: object::new(ctx),
                organisations: vec_map::empty(),
                wallet_addressToOrg: vec_map::empty(),
            }
        );
        transfer::share_object(
            LendRequestHandler {
                id: object::new(ctx),
                lend_requests: vec_map::empty(),
                borrower_pov_requests: vec_map::empty(),
                lender_pov_requests: vec_map::empty(),
            }
        );
        transfer::share_object(
            ClaimHandler {
                id: object::new(ctx),
                claims: vec_map::empty(),
                organisation_claims: vec_map::empty(),
                claim_to_voters_yes: vec_map::empty(),
                claim_to_voters_no: vec_map::empty(),
                claim_voters: vec_map::empty(),
            }
        );
    }
    entry public fun register_organisation(
        handler: &mut OrganisationHandler,
        name: String, 
        description: String,
        ctx: &mut TxContext
    ) {
        let new_org = Organisation {
            id: object::new(ctx),
            wallet_address: tx_context::sender(ctx),
            name,
            description,
            owner: tx_context::sender(ctx),
            carbon_credits: 0,
            times_lent: 0,
            total_lent: 0,
            times_borrowed: 0,
            total_borrowed: 0,
            total_returned: 0,
            times_returned: 0,
            emissions: 0,
            reputation_score: 0,
        };
        
        let org_id = object::id(&new_org);
        vec_map::insert(&mut handler.organisations, org_id, new_org);
        sui::event::emit(OrganisationCreated {
            organisation_id: org_id,
            name,
            owner: tx_context::sender(ctx)
        });
    }
    entry public fun change_organisation_details(
        handler: &mut OrganisationHandler,
        organisation_id: ID,
        name: String, 
        description: String, 
        ctx: &TxContext
    ) {
        assert!(!vec_map::contains(&handler.wallet_addressToOrg, &tx_context::sender(ctx)), 0);
        assert!(vec_map::contains(&handler.organisations, &organisation_id), 0);
        
        let org = vec_map::get_mut(&mut handler.organisations, &organisation_id);
        assert!(org.owner == tx_context::sender(ctx), 1);
        
        org.name = name;
        org.description = description;
        
        sui::event::emit(OrganisationUpdated {
            organisation_id,
            name,
            description
        });
    }
    public fun get_all_organisation_ids(handler: &OrganisationHandler): vector<ID> {
        let keys = vec_map::keys(&handler.organisations);
        keys
    }
    public(package) fun get_organisation_details(
        handler: &OrganisationHandler,
        organisation_id: ID
    ): (String, String, address, u64, u64, u64, u64, u64, u64, u64, u64, u64) {
        assert!(vec_map::contains(&handler.organisations, &organisation_id), 0);
        
        let org = vec_map::get(&handler.organisations, &organisation_id);
        
        (
            org.name,
            org.description,
            org.owner,
            org.carbon_credits,
            org.times_lent,
            org.total_lent,
            org.times_borrowed,
            org.total_borrowed,
            org.total_returned,
            org.times_returned,
            org.emissions,
            org.reputation_score
        )
    }
    public(package) fun get_organisation_count(handler: &OrganisationHandler): u64 {
        vec_map::size(&handler.organisations)
    }
    public fun is_organisation_owner(
        handler: &OrganisationHandler,
        organisation_id: ID,
        ctx: &mut TxContext,
    ): bool {
        if (!vec_map::contains(&handler.organisations, &organisation_id)) {
            return false
        };
        
        let org = vec_map::get(&handler.organisations, &organisation_id);
        org.owner == tx_context::sender(ctx)
    }
    public fun get_owned_organisations(
        handler: &OrganisationHandler,
        ctx: &mut TxContext,
    ): vector<ID> {
        let mut result = vector::empty<ID>();
        let keys = vec_map::keys(&handler.organisations);
        let mut i = 0;
        let len = vector::length(&keys);
        while (i < len) {
            let id = *vector::borrow(&keys, i);
            let org = vec_map::get(&handler.organisations, &id);
            
            if (org.owner == tx_context::sender(ctx)) {
                vector::push_back(&mut result, id);
            };
            
            i = i + 1;
        };
        result
    }


    // LEND REQUESTS 

    public struct LendRequestHandler has key {
        id: UID,
        lend_requests: VecMap<ID, LendRequest>,
        borrower_pov_requests: VecMap<address, vector<ID>>,
        lender_pov_requests: VecMap<address, vector<ID>>,
    }

    public struct LendRequest has key, store {
        id: UID,
        organisation_id: ID,
        lender: address,
        borrower: address,
        requested_amount: u64,
        time_of_issue: u64,
        time_of_return: u64,
        elgibility_score: u64,
        status: u64,
        proofData: String,
        recommendation: u64,
    }

    public fun create_lend_request(
        organisation_handler: &mut OrganisationHandler,
        clock: &Clock,
        handler: &mut LendRequestHandler,
        ctx: &mut TxContext,
        organisation_id: ID,
        requested_amount: u64,
        time_of_issue: u64,
        duration: u64,
    ) {
        let org : &mut Organisation = vec_map::get_mut(&mut organisation_handler.organisations, &organisation_id);
        let dummy: String = string::utf8(b"");
        let borrower_address = org.wallet_address;
        let lender_address = tx_context::sender(ctx);
        
        let new_request = LendRequest {
            id: object::new(ctx),
            organisation_id,
            lender: lender_address,
            borrower: borrower_address,
            requested_amount,
            time_of_issue: get_current_timestamp(clock),
            time_of_return: time_of_issue + duration,
            elgibility_score: 0,
            status: 0,
            proofData: dummy,
            recommendation: 0,
        };
        let request_id = object::id(&new_request);
        vec_map::insert(&mut handler.lend_requests, request_id, new_request);
        let borrower_requests = vec_map::get_mut(&mut handler.borrower_pov_requests, &borrower_address);
        vector::push_back(borrower_requests, request_id);
        let lender_requests = vec_map::get_mut(&mut handler.lender_pov_requests, &lender_address);
        vector::push_back(lender_requests, request_id);
    }

        public struct LendRequestView has copy, drop {
        request_id: ID,
        organisation_id: ID,
        lender: address,
        borrower: address,
        requested_amount: u64,
        time_of_issue: u64,
        time_of_return: u64,
        elgibility_score: u64,
        status: u64,
        proofData: String,
        recommendation: u64,
    }

    public fun payback_lend_request(
        handler: &mut LendRequestHandler, 
        ctx: &mut TxContext,
        lend_request_id: ID,
        organisation_handler: &mut OrganisationHandler,
        clock: &Clock,
    ){
        assert!(vec_map::contains(&handler.lend_requests, &lend_request_id), 0);
        let request = vec_map::get_mut(&mut handler.lend_requests, &lend_request_id);
        
        let sender = tx_context::sender(ctx);
        assert!(request.borrower == sender, 1);
        
        let org_id = vec_map::get(&organisation_handler.wallet_addressToOrg, &request.lender);
        let org_id_value = *org_id; 
        let org = vec_map::get_mut(&mut organisation_handler.organisations, &org_id_value);
        org.carbon_credits = org.carbon_credits + request.requested_amount;
        org.reputation_score = org.reputation_score;
        
        let org_id2 = vec_map::get(&organisation_handler.wallet_addressToOrg, &request.borrower);
        let org_id_value2 = *org_id2; 
        let org2 = vec_map::get_mut(&mut organisation_handler.organisations, &org_id_value2);
        org2.carbon_credits = org2.carbon_credits - request.requested_amount;
        org2.total_returned = org2.total_returned + request.requested_amount;
        org2.times_returned = org2.times_returned + 1;
        org2.reputation_score = org2.reputation_score + 1;
        
        request.time_of_return = get_current_timestamp(clock);
        request.status = 3;
    }

    public fun respond_to_lendRequest(
        handler: &mut LendRequestHandler,  
        org_handler: &mut OrganisationHandler,
        ctx: &mut TxContext, 
        response: u64,
        request_id: ID,
    ){
        assert!(vec_map::contains(&handler.lend_requests, &request_id), 0);
        let request = vec_map::get(&handler.lend_requests, &request_id);
        let sender = tx_context::sender(ctx);
        assert!(request.borrower == sender, 1);
        let request_mut = vec_map::get_mut(&mut handler.lend_requests, &request_id);
        request_mut.recommendation = response;
        if (response == 1) {

            let org_id = vec_map::get(&org_handler.wallet_addressToOrg, &request_mut.lender);
            let org_id_value = *org_id; 
            let org = vec_map::get_mut(&mut org_handler.organisations, &org_id_value);
            org.carbon_credits = org.carbon_credits - request_mut.requested_amount;
            org.times_lent = org.times_lent + 1;
            org.total_lent = org.total_lent + request_mut.requested_amount;
            org.reputation_score = org.reputation_score + 1;

            let org_id2 = vec_map::get(&org_handler.wallet_addressToOrg, &request_mut.borrower);
            let org_id_value2 = *org_id2; 
            let org2 = vec_map::get_mut(&mut org_handler.organisations, &org_id_value2);
            org2.carbon_credits = org2.carbon_credits + request_mut.requested_amount;
            org2.times_borrowed = org2.times_borrowed + 1;
            org2.total_borrowed = org2.total_borrowed + request_mut.requested_amount;
            request_mut.status = 1;
            
        } else {
            request_mut.status = 2; 
        };
    }

    public fun get_borrower_pov_requests(
        handler: &LendRequestHandler,
        ctx: &mut TxContext
    ): vector<LendRequestView> {
        let borrower_address = tx_context::sender(ctx);
        if (!vec_map::contains(&handler.borrower_pov_requests, &borrower_address)) {
            return vector::empty()
        };
        let request_ids = vec_map::get(&handler.borrower_pov_requests, &borrower_address);
        let mut result = vector::empty<LendRequestView>();
        let mut i = 0;
        let len = vector::length(request_ids);
        
        while (i < len) {
            let current_request_id = *vector::borrow(request_ids, i); 
            let request_id = *vector::borrow(request_ids, i);
            let request = vec_map::get(&handler.lend_requests,&current_request_id); 
            let view = LendRequestView {
                request_id: request_id, 
                organisation_id: request.organisation_id,
                lender: request.lender,
                borrower: request.borrower,
                requested_amount: request.requested_amount,
                time_of_issue: request.time_of_issue,
                time_of_return: request.time_of_return,
                elgibility_score: request.elgibility_score,
                status: request.status,
                proofData: request.proofData,
                recommendation: request.recommendation,
            };
            vector::push_back(&mut result, view);
            i = i + 1;
        };
        result
    }

    public fun get_lender_pov_requests(
        handler: &LendRequestHandler,
        ctx: &mut TxContext
    ): vector<LendRequestView> {
        let lender_address = tx_context::sender(ctx);
        if (!vec_map::contains(&handler.lender_pov_requests, &lender_address)) {
            return vector::empty()
        };
        let request_ids = vec_map::get(&handler.lender_pov_requests, &lender_address);
        let mut result = vector::empty<LendRequestView>();
        let mut i = 0;
        let len = vector::length(request_ids);
        
        while (i < len) {
            let current_request_id = *vector::borrow(request_ids, i); 
            let request_id = *vector::borrow(request_ids, i);
            let request = vec_map::get(&handler.lend_requests,&current_request_id); 
            let view = LendRequestView {
                request_id: request_id, 
                organisation_id: request.organisation_id,
                lender: request.lender,
                borrower: request.borrower,
                requested_amount: request.requested_amount,
                time_of_issue: request.time_of_issue,
                time_of_return: request.time_of_return,
                elgibility_score: request.elgibility_score,
                status: request.status,
                proofData: request.proofData,
                recommendation: request.recommendation,
            };
            vector::push_back(&mut result, view);
            i = i + 1;
        };
        result
    }
    public fun get_lend_request_details(
        handler: &LendRequestHandler,
        request_id: ID
    ): (ID, ID, address, address, u64, u64, u64, u64, u64, String, u64) {
        assert!(vec_map::contains(&handler.lend_requests, &request_id), 0);
        let id = request_id;
        let request = vec_map::get(&handler.lend_requests, &request_id);
        
        (
            id,
            request.organisation_id,
            request.lender,
            request.borrower,
            request.requested_amount,
            request.time_of_issue,
            request.time_of_return,
            request.elgibility_score,
            request.status,
            request.proofData,
            request.recommendation
        )  
    }

    public fun get_lend_request_count(handler: &LendRequestHandler): u64 {
        vec_map::size(&handler.lend_requests)
    }

    

    // CLAIMS 

    public struct Claim has key, store {
        id: UID,
        organisation_wallet_address: address,
        longitude: u64,
        latitude: u64,
        requested_carbon_credits: u64,
        status: u64,
        ipfs_hash: String,
        description: String,
        time_of_issue: u64,
        yes_votes: u64,
        no_votes: u64,
        total_votes: u64,  
        voting_period: u64,
    } 
    public struct ClaimHandler has key{
        id: UID,
        claims: VecMap<ID, Claim>,
        organisation_claims: VecMap<address, vector<ID>>,
        claim_to_voters_yes : VecMap<ID, vector<address>>,
        claim_to_voters_no : VecMap<ID, vector<address>>,
        claim_voters: VecMap<address, vector<ID>>,
    }

    public struct ClaimView has copy, drop {
        claim_id: ID,
        organisation_wallet_address: address,
        longitude: u64,
        latitude: u64,
        requested_carbon_credits: u64,
        status: u64,
        ipfs_hash: String,
        description: String,
        time_of_issue: u64,
        yes_votes: u64,
        no_votes: u64,
        total_votes: u64,  
        voting_period: u64
    }

    public fun create_claim(
        handler: &mut ClaimHandler,
        ctx: &mut TxContext,
        clock: &Clock,
        longitude: u64,
        latitude: u64,
        requested_carbon_credits: u64,
        status: u64,
        ipfs_hash: String,
        description: String,
        voting_period: u64
    ) {
        let new_claim = Claim {
            id: object::new(ctx),
            organisation_wallet_address: tx_context::sender(ctx),
            longitude,
            latitude,
            requested_carbon_credits,
            status,
            ipfs_hash,
            description,
            time_of_issue: get_current_timestamp(clock),
            yes_votes: 0,
            no_votes: 0,
            total_votes: 0,  
            voting_period
        };
        let claim_id = object::id(&new_claim);
        vec_map::insert(&mut handler.claims, claim_id, new_claim);
        let claims = vec_map::get_mut(&mut handler.organisation_claims, &tx_context::sender(ctx));
        vector::push_back(claims, claim_id);
    }

    public fun get_claim_details(
        handler: &ClaimHandler,
        claim_id: ID
    ): (ID, address, u64, u64, u64, u64, String, String, u64, u64, u64, u64) {
        assert!(vec_map::contains(&handler.claims, &claim_id), 0);
        let claim_id_duplicate = claim_id;
        let claim = vec_map::get(&handler.claims, &claim_id);
        (
            claim_id_duplicate,
            claim.organisation_wallet_address,
            claim.longitude,
            claim.latitude,
            claim.requested_carbon_credits,
            claim.status,
            claim.ipfs_hash,
            claim.description,
            claim.time_of_issue,
            claim.yes_votes,
            claim.no_votes,
            claim.total_votes
        )
    }

    public fun get_claim_count(handler: &ClaimHandler): u64 {
        vec_map::size(&handler.claims)
    }
    public fun get_claims_by_organisation(
        handler: &ClaimHandler,
        ctx: &mut TxContext
    ): vector<ClaimView> {
        let organisation_address = tx_context::sender(ctx);
        if (!vec_map::contains(&handler.organisation_claims, &organisation_address)) {
            return vector::empty()
        };
        let claim_ids = vec_map::get(&handler.organisation_claims, &organisation_address);
        let mut result = vector::empty<ClaimView>();
        let mut i = 0;
        let len = vector::length(claim_ids);
        while (i < len) {
            let claim_id = *vector::borrow(claim_ids, i);
            let claim_id2 = *vector::borrow(claim_ids, i);
            let claim = vec_map::get(&handler.claims, &claim_id);
            let view = ClaimView {
                claim_id: claim_id2,
                organisation_wallet_address: claim.organisation_wallet_address,
                longitude: claim.longitude,
                latitude: claim.latitude,
                requested_carbon_credits: claim.requested_carbon_credits,
                status: claim.status,
                ipfs_hash: claim.ipfs_hash,
                description: claim.description,
                time_of_issue: claim.time_of_issue,
                yes_votes: claim.yes_votes,
                no_votes: claim.no_votes,
                total_votes: claim.total_votes,  
                voting_period: claim.voting_period
            };
            vector::push_back(&mut result, view);
            i = i + 1;
        };
        result
    }
    
    public fun get_all_claims(
        organisation_handler: &mut OrganisationHandler,
        handler: &mut ClaimHandler, 
        clock: &Clock,
    ): vector<ClaimView> {
        let claim_ids: vector<ID> = vec_map::keys(&handler.claims);
        let mut result = vector::empty<ClaimView>();
        let mut i = 0;
        let len = vector::length(&claim_ids);
        while (i < len) {  
            let claim_id = *vector::borrow(&claim_ids, i);
            let claim_id2 = *vector::borrow(&claim_ids, i);
            let claim = vec_map::get_mut(&mut handler.claims, &claim_id); 
            let voting_end_time : u64 = claim.time_of_issue + claim.voting_period;
            let current_time : u64 = get_current_timestamp(clock);
            let mut final_yes_votes: u64 = claim.yes_votes;
            let mut final_no_votes: u64 = claim.no_votes;

            if(claim.status == 0 && voting_end_time < current_time) {
                if(claim.yes_votes > claim.no_votes) {
                    let org_id = vec_map::get(&organisation_handler.wallet_addressToOrg, &claim.organisation_wallet_address);
                    let org = vec_map::get_mut(&mut organisation_handler.organisations, org_id);
                    org.carbon_credits = org.carbon_credits + claim.requested_carbon_credits;
                    claim.status = 1; 
                    let claim_to_voters_yes: &mut vector<address> = vec_map::get_mut(&mut handler.claim_to_voters_yes, &claim_id);
                    let len1 = vector::length(claim_to_voters_yes);
                    while(i < len1){
                        let voter = *vector::borrow(claim_to_voters_yes, i);
                        let organisation_id = vec_map::get(&organisation_handler.wallet_addressToOrg, &voter);
                        let organisation = vec_map::get_mut(&mut organisation_handler.organisations, organisation_id);
                        organisation.reputation_score = organisation.reputation_score + 1;
                        i = i + 1;
                    }
                } else {
                    claim.status = 2;
                    let claim_to_voters_no: &mut vector<address> = vec_map::get_mut(&mut handler.claim_to_voters_no, &claim_id);
                    let len2 = vector::length(claim_to_voters_no);
                    while(i < len2){
                        let voter = *vector::borrow(claim_to_voters_no, i);
                        let organisation_id = vec_map::get(&organisation_handler.wallet_addressToOrg, &voter);
                        let organisation = vec_map::get_mut(&mut organisation_handler.organisations, organisation_id);
                        organisation.reputation_score = organisation.reputation_score + 1;
                        i = i + 1;
                    }
                }
            } else {
                final_yes_votes = 0;
                final_no_votes = 0;
            };

            let view = ClaimView {
                claim_id: claim_id2,
                organisation_wallet_address: claim.organisation_wallet_address,
                longitude: claim.longitude,
                latitude: claim.latitude,
                requested_carbon_credits: claim.requested_carbon_credits,
                status: claim.status,
                ipfs_hash: claim.ipfs_hash,
                description: claim.description,
                time_of_issue: claim.time_of_issue,
                yes_votes: final_yes_votes,
                no_votes: final_no_votes,
                total_votes: claim.total_votes,  
                voting_period: claim.voting_period
            };
            vector::push_back(&mut result, view);
            i = i + 1;
        };
        result
    }

    public fun vote_on_a_claim(
        handler: &mut ClaimHandler,
        ctx: &mut TxContext,
        claim_id: ID,
        vote: u64
    ) {
        assert!(vec_map::contains(&handler.claims, &claim_id), 0);
        let claim = vec_map::get_mut(&mut handler.claims, &claim_id);
        if (vote == 1) {
            claim.yes_votes = claim.yes_votes + 1;
            let voters = vec_map::get_mut(&mut handler.claim_to_voters_yes, &claim_id);
            vector::push_back(voters, tx_context::sender(ctx));
        } else {
            claim.no_votes = claim.no_votes + 1;
            let voters = vec_map::get_mut(&mut handler.claim_to_voters_no, &claim_id);
            vector::push_back(voters, tx_context::sender(ctx));
        };
        let voters = vec_map::get_mut(&mut handler.claim_voters, &tx_context::sender(ctx));
        vector::push_back(voters, claim_id);
    }

}