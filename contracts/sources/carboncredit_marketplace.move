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

    public struct OrganisationIDsEvent has copy, drop {
        ids: vector<ID>
    }

    public struct OrganisationDetailsEvent has copy, drop {
        organisation_id: ID,
        name: String,
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
        reputation_score: u64
    }

    public struct OrganisationCountEvent has copy, drop {
        count: u64
    }

    public struct IsOrganisationOwnerEvent has copy, drop {
        organisation_id: ID,
        is_owner: bool,
        caller: address
    }

    public struct OwnedOrganisationsEvent has copy, drop {
        owner: address,
        organisation_ids: vector<ID>
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

    entry public fun get_all_organisation_ids(
        handler: &OrganisationHandler,
        ctx: &mut TxContext
    ) {
        let ids = vec_map::keys(&handler.organisations);
        sui::event::emit(OrganisationIDsEvent {
            ids
        });
    }

    entry public fun get_organisation_details(
        handler: &OrganisationHandler,
        organisation_id: ID,
        ctx: &mut TxContext
    ) {
        assert!(vec_map::contains(&handler.organisations, &organisation_id), 0);
        let id = organisation_id;
        let org = vec_map::get(&handler.organisations, &id);
        
        sui::event::emit(OrganisationDetailsEvent {
            organisation_id,
            name: org.name,
            description: org.description,
            owner: org.owner,
            carbon_credits: org.carbon_credits,
            times_lent: org.times_lent,
            total_lent: org.total_lent,
            times_borrowed: org.times_borrowed,
            total_borrowed: org.total_borrowed,
            total_returned: org.total_returned,
            times_returned: org.times_returned,
            emissions: org.emissions,
            reputation_score: org.reputation_score
        });
    }

    entry public fun get_my_organisation_details(
        handler: &OrganisationHandler,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(vec_map::contains(&handler.wallet_addressToOrg, &sender), 0);
        let org_id = vec_map::get(&handler.wallet_addressToOrg, &sender);
        let id = *org_id;
        let org = vec_map::get(&handler.organisations, &id);
        
        sui::event::emit(OrganisationDetailsEvent {
            organisation_id: copy id,
            name: org.name,
            description: org.description,
            owner: org.owner,
            carbon_credits: org.carbon_credits,
            times_lent: org.times_lent,
            total_lent: org.total_lent,
            times_borrowed: org.times_borrowed,
            total_borrowed: org.total_borrowed,
            total_returned: org.total_returned,
            times_returned: org.times_returned,
            emissions: org.emissions,
            reputation_score: org.reputation_score
        });
    }

    entry public fun get_organisation_count(
        handler: &OrganisationHandler,
        ctx: &mut TxContext
    ) {
        let count = vec_map::size(&handler.organisations);
        sui::event::emit(OrganisationCountEvent {
            count
        });
    }

    entry public fun is_organisation_owner(
        handler: &OrganisationHandler,
        organisation_id: ID,
        ctx: &mut TxContext,
    ) {
        let is_owner = if (!vec_map::contains(&handler.organisations, &organisation_id)) {
            false
        } else {
            let org = vec_map::get(&handler.organisations, &organisation_id);
            org.owner == tx_context::sender(ctx)
        };
        
        sui::event::emit(IsOrganisationOwnerEvent {
            organisation_id,
            is_owner,
            caller: tx_context::sender(ctx)
        });
    }

    entry public fun get_owned_organisations(
        handler: &OrganisationHandler,
        ctx: &mut TxContext,
    ) {
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
        
        sui::event::emit(OwnedOrganisationsEvent {
            owner: tx_context::sender(ctx),
            organisation_ids: result
        });
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

    public struct LendRequestCreated has copy, drop {
        request_id: ID,
        organisation_id: ID,
        lender: address,
        borrower: address,
        amount: u64,
        issue_time: u64,
        return_time: u64
    }

    public struct LendRequestPaidBack has copy, drop {
        request_id: ID,
        borrower: address,
        lender: address,
        amount: u64,
        return_time: u64
    }

    public struct LendRequestResponded has copy, drop {
        request_id: ID,
        response: u64,
        responder: address
    }

    public struct BorrowerRequestsEvent has copy, drop {
        borrower: address,
        requests: vector<LendRequestView>
    }

    public struct LenderRequestsEvent has copy, drop {
        lender: address,
        requests: vector<LendRequestView>
    }

    public struct LendRequestDetailsEvent has copy, drop {
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
        recommendation: u64
    }

    public struct LendRequestCountEvent has copy, drop {
        count: u64
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

    entry public fun create_lend_request(
        organisation_handler: &mut OrganisationHandler,
        clock: &Clock,
        handler: &mut LendRequestHandler,
        organisation_id: ID,
        requested_amount: u64,
        time_of_issue: u64,
        duration: u64,
        ctx: &mut TxContext,
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
        sui::event::emit(LendRequestCreated {
            request_id,
            organisation_id,
            lender: lender_address,
            borrower: borrower_address,
            amount: requested_amount,
            issue_time:  get_current_timestamp(clock),
            return_time:  get_current_timestamp(clock) + duration,
        });
    }

    

    entry public fun payback_lend_request(
        handler: &mut LendRequestHandler, 
        lend_request_id: ID,
        organisation_handler: &mut OrganisationHandler,
        clock: &Clock,
        ctx: &mut TxContext,
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

        sui::event::emit(LendRequestPaidBack {
            request_id: lend_request_id,
            borrower: request.borrower,
            lender: request.lender,
            amount: request.requested_amount,
            return_time: request.time_of_return
        });
    }

    entry public fun respond_to_lendRequest(
        handler: &mut LendRequestHandler,  
        org_handler: &mut OrganisationHandler,
        response: u64,
        request_id: ID,
        ctx: &mut TxContext, 
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
        sui::event::emit(LendRequestResponded {
            request_id,
            response,
            responder: sender
        });
    }

    entry public fun get_borrower_pov_requests(
        handler: &LendRequestHandler,
        ctx: &mut TxContext
    ) {
        let borrower_address = tx_context::sender(ctx);
        let mut result = vector::empty<LendRequestView>();
        
        if (vec_map::contains(&handler.borrower_pov_requests, &borrower_address)) {
            let request_ids = vec_map::get(&handler.borrower_pov_requests, &borrower_address);
            let mut i = 0;
            let len = vector::length(request_ids);
            
            while (i < len) {
                let current_request_id = *vector::borrow(request_ids, i); 
                let request_id = *vector::borrow(request_ids, i);
                let request = vec_map::get(&handler.lend_requests, &current_request_id); 
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
        };
        
        sui::event::emit(BorrowerRequestsEvent {
            borrower: borrower_address,
            requests: result
        });
    }

    entry public fun get_lender_pov_requests(
        handler: &LendRequestHandler,
        ctx: &mut TxContext
    ) {
        let lender_address = tx_context::sender(ctx);
        let mut result = vector::empty<LendRequestView>();
        
        if (vec_map::contains(&handler.lender_pov_requests, &lender_address)) {
            let request_ids = vec_map::get(&handler.lender_pov_requests, &lender_address);
            let mut i = 0;
            let len = vector::length(request_ids);
            
            while (i < len) {
                let current_request_id = *vector::borrow(request_ids, i); 
                let request_id = *vector::borrow(request_ids, i);
                let request = vec_map::get(&handler.lend_requests, &current_request_id); 
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
        };
        
        sui::event::emit(LenderRequestsEvent {
            lender: lender_address,
            requests: result
        });
   }
    entry public fun get_lend_request_details(
        handler: &LendRequestHandler,
        request_id: ID,
        ctx: &mut TxContext
    ) {
        assert!(vec_map::contains(&handler.lend_requests, &request_id), 0);
        let id = request_id;
        let request = vec_map::get(&handler.lend_requests, &request_id);
        
        sui::event::emit(LendRequestDetailsEvent {
            request_id: id,
            organisation_id: request.organisation_id,
            lender: request.lender,
            borrower: request.borrower,
            requested_amount: request.requested_amount,
            time_of_issue: request.time_of_issue,
            time_of_return: request.time_of_return,
            elgibility_score: request.elgibility_score,
            status: request.status,
            proofData: request.proofData,
            recommendation: request.recommendation
        });

    }

    entry public fun get_lend_request_count(
        handler: &LendRequestHandler,
        ctx: &mut TxContext
    ) {
        let count = vec_map::size(&handler.lend_requests);
        sui::event::emit(LendRequestCountEvent {
            count
        });
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

    public struct ClaimCreated has copy, drop {
        claim_id: ID,
        organisation: address,
        longitude: u64,
        latitude: u64,
        amount: u64,
        ipfs_hash: String,
        voting_period: u64
    }

    public struct ClaimVoted has copy, drop {
        claim_id: ID,
        voter: address,
        vote: u64,  // 1 for yes, 0 for no
        current_yes: u64,
        current_no: u64
    }

    public struct ClaimDetailsEvent has copy, drop {
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

    public struct OrganisationClaimsEvent has copy, drop {
        organisation: address,
        claims: vector<ClaimView>
    }

    public struct AllClaimsEvent has copy, drop {
        claims: vector<ClaimView>
    }

    public struct ClaimCountEvent has copy, drop {
        count: u64
    }

    public struct ClaimResolved has copy, drop {
        claim_id: ID,
        status: u64,  // 1 for approved, 2 for rejected
        total_yes: u64,
        total_no: u64
    }

    entry public fun create_claim(
        handler: &mut ClaimHandler,
        clock: &Clock,
        longitude: u64,
        latitude: u64,
        requested_carbon_credits: u64,
        status: u64,
        ipfs_hash: String,
        description: String,
        voting_period: u64,
        ctx: &mut TxContext,
    ) {
        let new_claim = Claim {
            id: object::new(ctx),
            organisation_wallet_address: tx_context::sender(ctx),
            longitude,
            latitude,
            requested_carbon_credits,
            status,
            ipfs_hash: copy ipfs_hash,
            description: copy description,
            time_of_issue: get_current_timestamp(clock),
            yes_votes: 0,
            no_votes: 0,
            total_votes: 0,
            voting_period
        };
        
        let claim_id = object::id(&new_claim);
        vec_map::insert(&mut handler.claims, claim_id, new_claim);
        
        // Initialize organisation claims vector if it doesn't exist
        if (!vec_map::contains(&mut handler.organisation_claims, &tx_context::sender(ctx))) {
            vec_map::insert(&mut handler.organisation_claims, tx_context::sender(ctx), vector::empty());
        };
        
        let claims = vec_map::get_mut(&mut handler.organisation_claims, &tx_context::sender(ctx));
        vector::push_back(claims, claim_id);
        
        sui::event::emit(ClaimCreated {
            claim_id,
            organisation: tx_context::sender(ctx),
            longitude,
            latitude,
            amount: requested_carbon_credits,
            ipfs_hash,
            voting_period
        });
    }

    entry public fun get_claim_details(
        handler: &ClaimHandler,
        claim_id: ID,
        ctx: &mut TxContext
    ) {
        let id = claim_id;
        assert!(vec_map::contains(&handler.claims, &claim_id), 0);
        let claim = vec_map::get(&handler.claims, &claim_id);
        
        sui::event::emit(ClaimDetailsEvent {
            claim_id: id,
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
        });
    }

    entry public fun get_claim_count(
        handler: &ClaimHandler,
        ctx: &mut TxContext
    ) {
        let count = vec_map::size(&handler.claims);
        sui::event::emit(ClaimCountEvent {
            count
        });
    }

    entry public fun get_claims_by_organisation(
        handler: &ClaimHandler,
        ctx: &mut TxContext
    ) {
        let organisation_address = tx_context::sender(ctx);
        let mut result = vector::empty<ClaimView>();
        
        if (vec_map::contains(&handler.organisation_claims, &organisation_address)) {
            let claim_ids = vec_map::get(&handler.organisation_claims, &organisation_address);
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
        };
        
        sui::event::emit(OrganisationClaimsEvent {
            organisation: organisation_address,
            claims: result
        });
    }
    
    entry public fun get_all_claims(
        organisation_handler: &mut OrganisationHandler,
        handler: &mut ClaimHandler, 
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let claim_ids = vec_map::keys(&handler.claims);
        let mut result = vector::empty<ClaimView>();
        let mut i = 0;
        let len = vector::length(&claim_ids);
        
        while (i < len) {
            let claim_id = *vector::borrow(&claim_ids, i);
            let claim = vec_map::get_mut(&mut handler.claims, &claim_id);
            let voting_end_time = claim.time_of_issue + claim.voting_period;
            let current_time = get_current_timestamp(clock);
            
            if (claim.status == 0 && voting_end_time < current_time) {
                if (claim.yes_votes > claim.no_votes) {
                    let org_id = vec_map::get(&organisation_handler.wallet_addressToOrg, &claim.organisation_wallet_address);
                    let org = vec_map::get_mut(&mut organisation_handler.organisations, org_id);
                    org.carbon_credits = org.carbon_credits + claim.requested_carbon_credits;
                    claim.status = 1;
                    
                    // Update reputation for yes voters
                    if (vec_map::contains(&handler.claim_to_voters_yes, &claim_id)) {
                        let voters = vec_map::get(&handler.claim_to_voters_yes, &claim_id);
                        let mut j = 0;
                        let voters_len = vector::length(voters);
                        while (j < voters_len) {
                            let voter = *vector::borrow(voters, j);
                            if (vec_map::contains(&organisation_handler.wallet_addressToOrg, &voter)) {
                                let voter_org_id = vec_map::get(&organisation_handler.wallet_addressToOrg, &voter);
                                let voter_org = vec_map::get_mut(&mut organisation_handler.organisations, voter_org_id);
                                voter_org.reputation_score = voter_org.reputation_score + 1;
                            };
                            j = j + 1;
                        };
                    };
                    
                    sui::event::emit(ClaimResolved {
                        claim_id,
                        status: 1,
                        total_yes: claim.yes_votes,
                        total_no: claim.no_votes
                    });
                } else {
                    claim.status = 2;
                    
                    // Update reputation for no voters
                    if (vec_map::contains(&handler.claim_to_voters_no, &claim_id)) {
                        let voters = vec_map::get(&handler.claim_to_voters_no, &claim_id);
                        let mut j = 0;
                        let voters_len = vector::length(voters);
                        while (j < voters_len) {
                            let voter = *vector::borrow(voters, j);
                            if (vec_map::contains(&organisation_handler.wallet_addressToOrg, &voter)) {
                                let voter_org_id = vec_map::get(&organisation_handler.wallet_addressToOrg, &voter);
                                let voter_org = vec_map::get_mut(&mut organisation_handler.organisations, voter_org_id);
                                voter_org.reputation_score = voter_org.reputation_score + 1;
                            };
                            j = j + 1;
                        };
                    };
                    
                    sui::event::emit(ClaimResolved {
                        claim_id,
                        status: 2,
                        total_yes: claim.yes_votes,
                        total_no: claim.no_votes
                    });
                };
            };
            
            let view = ClaimView {
                claim_id,
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
        
        sui::event::emit(AllClaimsEvent {
            claims: result
        });
    }

    entry public fun vote_on_a_claim(
        handler: &mut ClaimHandler,
        clock: &Clock,
        claim_id: ID,
        vote: u64,
        ctx: &mut TxContext,
    ) {
        assert!(vec_map::contains(&handler.claims, &claim_id), 0);
        let claim = vec_map::get_mut(&mut handler.claims, &claim_id);
        
        // Ensure voting period hasn't ended
        let current_time = get_current_timestamp(clock);
        assert!(current_time <= claim.time_of_issue + claim.voting_period, 1);
        
        // Ensure voter hasn't voted before
        if (vec_map::contains(&handler.claim_voters, &tx_context::sender(ctx))) {
            let voter_claims = vec_map::get(&handler.claim_voters, &tx_context::sender(ctx));
            assert!(!vector::contains(voter_claims, &claim_id), 2);
        };
        
        if (vote == 1) {
            claim.yes_votes = claim.yes_votes + 1;
            // Initialize yes voters vector if it doesn't exist
            if (!vec_map::contains(&mut handler.claim_to_voters_yes, &claim_id)) {
                vec_map::insert(&mut handler.claim_to_voters_yes, claim_id, vector::empty());
            };
            let voters = vec_map::get_mut(&mut handler.claim_to_voters_yes, &claim_id);
            vector::push_back(voters, tx_context::sender(ctx));
        } else {
            claim.no_votes = claim.no_votes + 1;
            // Initialize no voters vector if it doesn't exist
            if (!vec_map::contains(&mut handler.claim_to_voters_no, &claim_id)) {
                vec_map::insert(&mut handler.claim_to_voters_no, claim_id, vector::empty());
            };
            let voters = vec_map::get_mut(&mut handler.claim_to_voters_no, &claim_id);
            vector::push_back(voters, tx_context::sender(ctx));
        };
        
        claim.total_votes = claim.total_votes + 1;
        if (!vec_map::contains(&mut handler.claim_voters, &tx_context::sender(ctx))) {
            vec_map::insert(&mut handler.claim_voters, tx_context::sender(ctx), vector::empty());
        };
        let voter_claims = vec_map::get_mut(&mut handler.claim_voters, &tx_context::sender(ctx));
        vector::push_back(voter_claims, claim_id);
        
        sui::event::emit(ClaimVoted {
            claim_id,
            voter: tx_context::sender(ctx),
            vote,
            current_yes: claim.yes_votes,
            current_no: claim.no_votes
        });
    }
}