module carbon_credit::carbon_credit_lending {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::package;
    
    /// Module initializer is triggered when the module is published
    public struct CARBON_CREDIT_LENDING has drop {}

    /// Coin type for carbon credits
    public struct CARBON_COIN has drop {}

    /// Simple loan object
    public struct Loan has key, store {
        id: UID,
        lender: address,
        borrower: address,
        amount: u64,
        repaid: bool
    }

    /// One-time initialization function
    fun init(witness: CARBON_CREDIT_LENDING, ctx: &mut TxContext) {
        // Here you can initialize a shared object, treasury, etc.
        // We'll just acknowledge the one-time witness
        package::claim_and_keep(witness, ctx);
    }

    /// Create a new loan
    public entry fun create_loan(
        lender: address,
        borrower: address,
        amount: u64,
        carbon_coin: Coin<CARBON_COIN>,
        ctx: &mut TxContext
    ) {
        assert!(amount > 0, 0);
        
        // Verify the coin has the correct amount
        assert!(coin::value(&carbon_coin) == amount, 1);

        // Create loan object
        let loan = Loan {
            id: object::new(ctx),
            lender,
            borrower,
            amount,
            repaid: false
        };

        // Transfer loan to borrower and coins to lender
        transfer::public_transfer(loan, borrower);
        transfer::public_transfer(carbon_coin, lender);
    }

    /// Repay a loan
    public entry fun repay_loan(
        borrower: address,
        loan: &mut Loan,
        repayment: Coin<CARBON_COIN>,
        ctx: &mut TxContext
    ) {
        // Check that the caller is the borrower
        assert!(loan.borrower == borrower, 0);
        assert!(!loan.repaid, 1);
        assert!(coin::value(&repayment) == loan.amount, 2);

        loan.repaid = true;
        
        // Transfer repayment to lender
        transfer::public_transfer(repayment, loan.lender);
    }

    /// Check if loan is repaid
    public fun is_repaid(loan: &Loan): bool {
        loan.repaid
    }
}