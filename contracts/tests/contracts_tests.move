// #[test_only]
// module 0x3::carbon_marketplace_tests {
//     use sui::test_scenario;
//     use sui::transfer;
//     use std::string;
//     use 0x3::carbon_marketplace;
//     use sui::vec_map::{Self, VecMap};

//     #[test]
//     fun test_organization_flow() {
//         let admin = @0x0;
//         let mut scenario = test_scenario::begin(admin);
        
//         // 1. Create and share the handler for testing
//         scenario.next_tx(admin);
//         {
//             let ctx = test_scenario::ctx(&mut scenario);
//             let handler = carbon_marketplace::create_for_testing(ctx);
//             transfer::share_object(handler);
//         };
        
//         // 2. Test registration
//         scenario.next_tx(admin);
//         {
//             let name = string::utf8(b"Test Org");
//             let desc = string::utf8(b"Test Desc");
            
//             let mut handler = test_scenario::take_shared<carbon_marketplace::OrganisationHandler>(&scenario);
//             let ctx = test_scenario::ctx(&mut scenario);
            
//             carbon_marketplace::register_organisation(
//                 &mut handler,
//                 ctx,
//                 name,
//                 desc
//             );
            
//             // Verify registration
//             assert!(carbon_marketplace::get_organisation_count(&mut handler) == 1, 0);
//             test_scenario::return_shared(handler);
//         };
        
//         test_scenario::end(scenario);
//     }
// }