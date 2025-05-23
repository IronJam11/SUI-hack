

// Replace with your actual package ID and handler object ID


import {
    useCurrentAccount,
    useSignAndExecuteTransaction,
    useSuiClient
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import {
    Container,
    Flex,
    Heading,
    Text,
    Button,
    TextField,
    TextArea,
    Card,
    Grid,
    Select
} from "@radix-ui/themes";
import { useState } from "react";

// Replace with your actual package ID and handler object ID
const CLAIM_HANDLER_ID = "0x9dfc31fa670a2722a806be47eef3fd02b98db35d8c6910a2ef9a2868793a6225";
const PACKAGE_ID = "0x0514cb5817179ac60a31c8b552c252928745a35048e189e0a857ea2a8487000a";
const CLOCK_OBJECT_ID = "0x6"; // Standard Sui Clock object

export function CreateClaim() {
    const account = useCurrentAccount();
    const [formData, setFormData] = useState({
        longitude: "",
        latitude: "",
        credits: "",
        ipfsHash: "",
        description: "",
        votingPeriod: "604800" // Default 7 days in seconds
    });
    const [status, setStatus] = useState("1"); // Default status (1 = Pending)
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();
    const suiClient = useSuiClient();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const resetForm = () => {
        setFormData({
            longitude: "",
            latitude: "",
            credits: "",
            ipfsHash: "",
            description: "",
            votingPeriod: "604800"
        });
        setStatus("1");
        setError("");
        setSuccess("");
    };

    const handleSubmit = async () => {
        console.log("HandleSubmit called");
        
        if (!account) {
            setError("Wallet not connected");
            return;
        }

        // Validate inputs
        if (!formData.longitude || !formData.latitude || !formData.credits ||
            !formData.ipfsHash || !formData.description) {
            setError("All fields are required");
            return;
        }

        console.log("Starting transaction...");
        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const tx = new Transaction();

            tx.moveCall({
                target: `${PACKAGE_ID}::carbon_marketplace::create_claim`,
                arguments: [
                    tx.object(CLAIM_HANDLER_ID),
                    tx.object(CLOCK_OBJECT_ID), // Clock object
                    tx.pure.u64(BigInt(formData.longitude)),
                    tx.pure.u64(BigInt(formData.latitude)),
                    tx.pure.u64(BigInt(formData.credits)),
                    tx.pure.u64(BigInt(status)), // Status
                    tx.pure.string(formData.ipfsHash),
                    tx.pure.string(formData.description),
                    tx.pure.u64(BigInt(formData.votingPeriod)),
                ],
            });

            console.log("Transaction created, signing...");

            signAndExecute(
                {
                    transaction: tx,
                },
                {
                    onSuccess: async (txResponse) => {
                        console.log("Transaction success:", txResponse);
                        
                        try {
                            const txResult = await suiClient.waitForTransaction({
                                digest: txResponse.digest,
                                options: {
                                    showEvents: true,
                                    showEffects: true
                                }
                            });

                            console.log("Transaction result:", txResult);

                            const events = txResult.events || [];
                            const claimEvent = events.find(e =>
                                e.type.endsWith("::carbon_marketplace::ClaimCreated")
                            );

                            if (claimEvent) {
                                const parsedJson = claimEvent.parsedJson as { claim_id: string };
                                setSuccess(`Claim created successfully! Claim ID: ${parsedJson.claim_id}`);
                            } else {
                                setSuccess("Claim created successfully!");
                            }
                            
                            // Reset form after 3 seconds
                            setTimeout(() => {
                                console.log("Auto-resetting form...");
                                resetForm();
                            }, 3000);
                            
                        } catch (waitError) {
                            console.error("Error waiting for transaction:", waitError);
                            setSuccess("Transaction submitted successfully!");
                            setTimeout(() => {
                                resetForm();
                            }, 3000);
                        } finally {
                            setLoading(false);
                        }
                    },
                    onError: (error) => {
                        console.error("Transaction error:", error);
                        setError(error.message || "Transaction failed");
                        setLoading(false);
                    },
                }
            );
        } catch (error) {
            console.error("Submit error:", error);
            setError(error instanceof Error ? error.message : "Unknown error");
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f172a 0%, #064e3b 50%, #000000 100%)',
            padding: '2rem 1rem',
            position: 'relative'
        }}>
            {/* Background particles */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 0 }}>
                {[...Array(12)].map((_, i) => (
                    <div
                        key={i}
                        style={{
                            position: 'absolute',
                            width: '3px',
                            height: '3px',
                            background: 'rgba(16, 185, 129, 0.2)',
                            borderRadius: '50%',
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animation: `pulse ${4 + Math.random() * 2}s infinite`,
                            animationDelay: `${Math.random() * 3}s`
                        }}
                    />
                ))}
            </div>
    
            <div style={{
                maxWidth: '800px',
                margin: '0 auto',
                position: 'relative',
                zIndex: 1
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <h1 style={{
                        fontSize: 'clamp(2rem, 5vw, 3rem)',
                        fontWeight: 'bold',
                        background: 'linear-gradient(135deg, #10b981, #34d399, #6ee7b7)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '0.5rem'
                    }}>
                        Create Carbon Credit Claim
                    </h1>
                    <p style={{
                        color: 'rgba(187, 247, 208, 0.8)',
                        fontSize: '1.1rem'
                    }}>
                        Submit your carbon credit claim for verification and approval
                    </p>
                </div>
    
                {/* Main Form Card */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '20px',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    padding: '2.5rem',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
                }}>
                    {!account ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '3rem 1rem',
                            background: 'rgba(239, 68, 68, 0.1)',
                            borderRadius: '15px',
                            border: '1px solid rgba(239, 68, 68, 0.2)'
                        }}>
                            <div style={{
                                width: '60px',
                                height: '60px',
                                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 1rem auto'
                            }}>
                                <svg style={{ width: '24px', height: '24px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <p style={{
                                color: '#fca5a5',
                                fontSize: '1.1rem',
                                fontWeight: '500'
                            }}>
                                Please connect your wallet to create a claim
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            {/* Location Section */}
                            <div>
                                <h3 style={{
                                    color: '#10b981',
                                    fontSize: '1.2rem',
                                    fontWeight: '600',
                                    marginBottom: '1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Project Location
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            name="longitude"
                                            placeholder="Longitude (e.g., -122.4194)"
                                            value={formData.longitude}
                                            onChange={handleChange}
                                            disabled={loading}
                                            style={{
                                                width: '100%',
                                                padding: '1rem 1.25rem',
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                                borderRadius: '12px',
                                                color: 'white',
                                                fontSize: '1rem',
                                                transition: 'all 0.3s ease',
                                                outline: 'none'
                                            }}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = '#10b981';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = 'rgba(16, 185, 129, 0.2)';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        />
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            name="latitude"
                                            placeholder="Latitude (e.g., 37.7749)"
                                            value={formData.latitude}
                                            onChange={handleChange}
                                            disabled={loading}
                                            style={{
                                                width: '100%',
                                                padding: '1rem 1.25rem',
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                                borderRadius: '12px',
                                                color: 'white',
                                                fontSize: '1rem',
                                                transition: 'all 0.3s ease',
                                                outline: 'none'
                                            }}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = '#10b981';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = 'rgba(16, 185, 129, 0.2)';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
    
                            {/* Credits Section */}
                            <div>
                                <h3 style={{
                                    color: '#10b981',
                                    fontSize: '1.2rem',
                                    fontWeight: '600',
                                    marginBottom: '1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                    </svg>
                                    Carbon Credits
                                </h3>
                                <input
                                    name="credits"
                                    placeholder="Requested Carbon Credits"
                                    value={formData.credits}
                                    onChange={handleChange}
                                    type="number"
                                    disabled={loading}
                                    style={{
                                        width: '100%',
                                        padding: '1rem 1.25rem',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(16, 185, 129, 0.2)',
                                        borderRadius: '12px',
                                        color: 'white',
                                        fontSize: '1rem',
                                        transition: 'all 0.3s ease',
                                        outline: 'none'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#10b981';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = 'rgba(16, 185, 129, 0.2)';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                            </div>
    
                            {/* Documentation Section */}
                            <div>
                                <h3 style={{
                                    color: '#10b981',
                                    fontSize: '1.2rem',
                                    fontWeight: '600',
                                    marginBottom: '1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Documentation
                                </h3>
                                <input
                                    name="ipfsHash"
                                    placeholder="IPFS Hash for supporting documents"
                                    value={formData.ipfsHash}
                                    onChange={handleChange}
                                    disabled={loading}
                                    style={{
                                        width: '100%',
                                        padding: '1rem 1.25rem',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(16, 185, 129, 0.2)',
                                        borderRadius: '12px',
                                        color: 'white',
                                        fontSize: '1rem',
                                        transition: 'all 0.3s ease',
                                        outline: 'none',
                                        marginBottom: '1rem'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#10b981';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = 'rgba(16, 185, 129, 0.2)';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                                <textarea
                                    name="description"
                                    placeholder="Detailed description of the carbon credit claim"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows={4}
                                    disabled={loading}
                                    style={{
                                        width: '100%',
                                        padding: '1rem 1.25rem',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(16, 185, 129, 0.2)',
                                        borderRadius: '12px',
                                        color: 'white',
                                        fontSize: '1rem',
                                        transition: 'all 0.3s ease',
                                        outline: 'none',
                                        resize: 'vertical',
                                        minHeight: '120px'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#10b981';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = 'rgba(16, 185, 129, 0.2)';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                            </div>
    
                            {/* Settings Section */}
                            <div>
                                <h3 style={{
                                    color: '#10b981',
                                    fontSize: '1.2rem',
                                    fontWeight: '600',
                                    marginBottom: '1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Settings
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', color: 'rgba(187, 247, 208, 0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                            Status
                                        </label>
                                        <select
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value)}
                                            disabled={loading}
                                            style={{
                                                width: '100%',
                                                padding: '1rem 1.25rem',
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                                borderRadius: '12px',
                                                color: 'white',
                                                fontSize: '1rem',
                                                transition: 'all 0.3s ease',
                                                outline: 'none'
                                            }}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = '#10b981';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = 'rgba(16, 185, 129, 0.2)';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        >
                                            <option value="1" style={{ background: '#1f2937', color: 'white' }}>Pending</option>
                                            <option value="2" style={{ background: '#1f2937', color: 'white' }}>Under Review</option>
                                            <option value="3" style={{ background: '#1f2937', color: 'white' }}>Approved</option>
                                            <option value="4" style={{ background: '#1f2937', color: 'white' }}>Rejected</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', color: 'rgba(187, 247, 208, 0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                            Voting Period
                                        </label>
                                        <select
                                            value={formData.votingPeriod}
                                            onChange={(e) => setFormData(prev => ({ ...prev, votingPeriod: e.target.value }))}
                                            disabled={loading}
                                            style={{
                                                width: '100%',
                                                padding: '1rem 1.25rem',
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                                borderRadius: '12px',
                                                color: 'white',
                                                fontSize: '1rem',
                                                transition: 'all 0.3s ease',
                                                outline: 'none'
                                            }}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = '#10b981';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = 'rgba(16, 185, 129, 0.2)';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        >
                                            <option value="86400" style={{ background: '#1f2937', color: 'white' }}>1 Day Voting</option>
                                            <option value="259200" style={{ background: '#1f2937', color: 'white' }}>3 Days Voting</option>
                                            <option value="604800" style={{ background: '#1f2937', color: 'white' }}>7 Days Voting</option>
                                            <option value="1209600" style={{ background: '#1f2937', color: 'white' }}>14 Days Voting</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
    
                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    style={{
                                        flex: '1',
                                        minWidth: '200px',
                                        padding: '1rem 2rem',
                                        background: loading ? 'rgba(107, 114, 128, 0.5)' : 'linear-gradient(135deg, #10b981, #059669)',
                                        border: 'none',
                                        borderRadius: '12px',
                                        color: 'white',
                                        fontSize: '1.1rem',
                                        fontWeight: '600',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.3s ease',
                                        opacity: loading ? 0.7 : 1
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!loading) {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 10px 25px rgba(16, 185, 129, 0.3)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!loading) {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }
                                    }}
                                >
                                    {loading ? (
                                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                            <div style={{
                                                width: '16px',
                                                height: '16px',
                                                border: '2px solid rgba(255, 255, 255, 0.3)',
                                                borderTop: '2px solid white',
                                                borderRadius: '50%',
                                                animation: 'spin 1s linear infinite'
                                            }} />
                                            Processing...
                                        </span>
                                    ) : "Submit Claim"}
                                </button>
                                
                                {(success || error) && (
                                    <button
                                        onClick={resetForm}
                                        disabled={loading}
                                        style={{
                                            padding: '1rem 2rem',
                                            background: 'rgba(255, 255, 255, 0.1)',
                                            border: '1px solid rgba(16, 185, 129, 0.3)',
                                            borderRadius: '12px',
                                            color: '#6ee7b7',
                                            fontSize: '1.1rem',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease',
                                            backdropFilter: 'blur(10px)'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                                            e.currentTarget.style.borderColor = '#10b981';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                            e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                                        }}
                                    >
                                        Create Another
                                    </button>
                                )}
                            </div>
    
                            {/* Status Messages */}
                            {error && (
                                <div style={{
                                    padding: '1.5rem',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '0.75rem'
                                }}>
                                    <svg style={{ width: '20px', height: '20px', color: '#f87171', flexShrink: 0, marginTop: '2px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <p style={{ color: '#fca5a5', fontWeight: '600', marginBottom: '0.25rem' }}>
                                            Error
                                        </p>
                                        <p style={{ color: '#f87171' }}>
                                            {error}
                                        </p>
                                    </div>
                                </div>
                            )}
    
                            {success && (
                                <div style={{
                                    padding: '1.5rem',
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '0.75rem'
                                }}>
                                    <svg style={{ width: '20px', height: '20px', color: '#10b981', flexShrink: 0, marginTop: '2px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <p style={{ color: '#6ee7b7', fontWeight: '600', marginBottom: '0.25rem' }}>
                                            Success!
                                        </p>
                                        <p style={{ color: '#10b981', marginBottom: '0.5rem' }}>
                                            {success}
                                        </p>
                                        <p style={{ color: 'rgba(187, 247, 208, 0.7)', fontSize: '0.9rem' }}>
                                            Form will reset automatically in 3 seconds, or click "Create Another" to reset now.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
    
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 0.2; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.1); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                input::placeholder, textarea::placeholder {
                    color: rgba(187, 247, 208, 0.5);
                }
            `}</style>
        </div>
    );
}