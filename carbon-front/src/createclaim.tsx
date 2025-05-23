

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
        <Container size="2" my="4">
            <Card>
                <Heading mb="4" size="4">Create New Carbon Credit Claim</Heading>

                {!account ? (
                    <Text color="gray">Please connect your wallet to create a claim</Text>
                ) : (
                    <Flex direction="column" gap="3">
                        <Grid columns="2" gap="3">
                            <TextField.Root>
                                <input
                                    name="longitude"
                                    placeholder="Longitude (e.g., -122.4194)"
                                    value={formData.longitude}
                                    onChange={handleChange}
                                    disabled={loading}
                                />
                            </TextField.Root>

                            <TextField.Root>
                                <input
                                    name="latitude"
                                    placeholder="Latitude (e.g., 37.7749)"
                                    value={formData.latitude}
                                    onChange={handleChange}
                                    disabled={loading}
                                />
                            </TextField.Root>
                        </Grid>

                        <TextField.Root>
                            <input
                                name="credits"
                                placeholder="Requested Carbon Credits"
                                value={formData.credits}
                                onChange={handleChange}
                                type="number"
                                disabled={loading}
                            />
                        </TextField.Root>

                        <TextField.Root>
                            <input
                                name="ipfsHash"
                                placeholder="IPFS Hash for supporting documents"
                                value={formData.ipfsHash}
                                onChange={handleChange}
                                disabled={loading}
                            />
                        </TextField.Root>

                        <TextArea
                            name="description"
                            placeholder="Detailed description of the carbon credit claim"
                            value={formData.description}
                            onChange={handleChange}
                            rows={4}
                            disabled={loading}
                        />

                        <Grid columns="2" gap="3">
                            <Select.Root
                                value={status}
                                onValueChange={setStatus}
                                disabled={loading}
                            >
                                <Select.Trigger />
                                <Select.Content>
                                    <Select.Item value="1">Pending</Select.Item>
                                    <Select.Item value="2">Under Review</Select.Item>
                                    <Select.Item value="3">Approved</Select.Item>
                                    <Select.Item value="4">Rejected</Select.Item>
                                </Select.Content>
                            </Select.Root>

                            <Select.Root
                                value={formData.votingPeriod}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, votingPeriod: value }))}
                                disabled={loading}
                            >
                                <Select.Trigger />
                                <Select.Content>
                                    <Select.Item value="86400">1 Day Voting</Select.Item>
                                    <Select.Item value="259200">3 Days Voting</Select.Item>
                                    <Select.Item value="604800">7 Days Voting</Select.Item>
                                    <Select.Item value="1209600">14 Days Voting</Select.Item>
                                </Select.Content>
                            </Select.Root>
                        </Grid>

                        <Flex gap="2">
                            <Button
                                size="2"
                                onClick={handleSubmit}
                                disabled={loading}
                                style={{ flex: 1 }}
                            >
                                {loading ? "Processing..." : "Submit Claim"}
                            </Button>
                            
                            {(success || error) && (
                                <Button
                                    size="2"
                                    variant="outline"
                                    onClick={resetForm}
                                    disabled={loading}
                                >
                                    Create Another
                                </Button>
                            )}
                        </Flex>

                        {error && (
                            <Card style={{ backgroundColor: '#fef2f2', padding: '1rem' }}>
                                <Text color="red">
                                    <strong>Error:</strong> {error}
                                </Text>
                            </Card>
                        )}

                        {success && (
                            <Card style={{ backgroundColor: '#f0fdf4', padding: '1rem' }}>
                                <Text color="green">
                                    <strong>Success!</strong> {success}
                                </Text>
                                <Text size="1" color="gray" style={{ display: 'block', marginTop: '0.5rem' }}>
                                    Form will reset automatically in 3 seconds, or click "Create Another" to reset now.
                                </Text>
                            </Card>
                        )}
                    </Flex>
                )}
            </Card>
        </Container>
    );
}