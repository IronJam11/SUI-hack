module 0x3::carbon_marketplace {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use std::string::{Self, String};
    use sui::table::{Self, Table};
    use sui::vec_map::{Self, VecMap};




    // ORGANISATIONS 
    
    public struct OrganisationHandler has key {
        id: UID,
        organisations: VecMap<ID, Organisation>,
    }
    
    public struct Organisation has key, store {
        id: UID,
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
            }
        )
    }
    public fun register_organisation(
        handler: &mut OrganisationHandler,
        ctx: &mut TxContext,
        name: String, 
        description: String
    ) {
        let new_org = Organisation {
            id: object::new(ctx),
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
    public fun change_organisation_details(
        handler: &mut OrganisationHandler,
        organisation_id: ID,
        name: String, 
        description: String, 
        ctx: &TxContext
    ) {
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
    public fun get_organisation_details(
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
    public fun get_organisation_count(handler: &OrganisationHandler): u64 {
        vec_map::size(&handler.organisations)
    }
    public fun is_organisation_owner(
        handler: &OrganisationHandler,
        organisation_id: ID,
        addr: address
    ): bool {
        if (!vec_map::contains(&handler.organisations, &organisation_id)) {
            return false
        };
        
        let org = vec_map::get(&handler.organisations, &organisation_id);
        org.owner == addr
    }
    public fun get_owned_organisations(
        handler: &OrganisationHandler,
        owner: address
    ): vector<ID> {
        let mut result = vector::empty<ID>();
        let keys = vec_map::keys(&handler.organisations);
        let mut i = 0;
        let len = vector::length(&keys);
        while (i < len) {
            let id = *vector::borrow(&keys, i);
            let org = vec_map::get(&handler.organisations, &id);
            
            if (org.owner == owner) {
                vector::push_back(&mut result, id);
            };
            
            i = i + 1;
        };
        result
    }


    // LEND REQUESTS 

    public struct LenRequest has key, store {
        id: UID, 
        organisation_id: ID,
        lender: address,
        borrower: address,
    }




}