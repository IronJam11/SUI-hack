#[test_only]
module 0x3::carbon_marketplace_tests {
    use 0x3::carbon_marketplace::{Self, OrganisationHandler, Organisation, OrganisationCreated};
    use sui::test_scenario::{Self, Scenario};
    use sui::test_utils;
    use std::string;
    use sui::vec_map;

    const ADMIN: address = @0xD;
    const USER1: address = @0x1;

    #[test]
fun test_register_organisation() {
    use sui::test_scenario;
    
    // Create test address representing user
    let user = @0xCAFE;
    
    // First transaction to initialize the module
    let mut scenario = test_scenario::begin(user);
    {
        // Initialize the module (creates shared OrganisationHandler)
        carbon_marketplace::init_for_testing(scenario.ctx());
    };
    
    // Second transaction to register organisation
    scenario.next_tx(user);
    {
        // Take the shared OrganisationHandler object
        let mut handler = scenario.take_shared<OrganisationHandler>();
        
        // Register organisation
        carbon_marketplace::register_organisation(
            &mut handler,
            scenario.ctx(),
            string::utf8(b"Test Organization"),
            string::utf8(b"Test Description")
        );
        
        // Return the handler to shared pool
        scenario.return_shared(handler);
    };
    
    scenario.end();
 }
}

    
