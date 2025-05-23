import { 
    useCurrentAccount, 
    useSignAndExecuteTransaction, 
    useSuiClientQuery,
    useSuiClient
  } from "@mysten/dapp-kit";
  import { Transaction } from "@mysten/sui/transactions";
  import { 
    Container, 
    Flex, 
    Heading, 
    Text, 
    Button, 
    Card,
    Table,
    Badge,
    Box,
    Dialog,
    TextField,
    Select,
    Avatar
  } from "@radix-ui/themes";
  import { useState, useEffect } from "react";
  
  const ORGANIZATION_HANDLER_ID = "0x3e93f9c3174505789f34825c4833e59adeb9b3f68adb8bfd53ecdcf0b61b75db";
  const LEND_REQUEST_HANDLER_ID = "0x74b52a993916d235e68de2033b67529c9f0ea8c73fc5341ccaa24b37afd95b96";
  const PACKAGE_ID = "0x0514cb5817179ac60a31c8b552c252928745a35048e189e0a857ea2a8487000a";
  const CLOCK_OBJECT_ID = "0x6";
  
  type Organization = {
    organisation_id: string;
    name: string;
    carbon_credits: number;
    reputation_score: number;
    owner: string;
  };
  
  export function LendRequestPage() {
    const account = useCurrentAccount();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
    const [requestAmount, setRequestAmount] = useState("");
    const [duration, setDuration] = useState("604800");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();
    const suiClient = useSuiClient();
  
    // Fetch all organizations using devInspect (read-only, no wallet popup)
    const fetchOrganizations = async () => {
      if (!account) return;
  
      setLoading(true);
      setError("");
  
      try {
        const tx = new Transaction();
        
        tx.moveCall({
          target: `${PACKAGE_ID}::carbon_marketplace::get_all_organisation_ids`,
          arguments: [
            tx.object(ORGANIZATION_HANDLER_ID),
          ],
        });
  
        // Use devInspectTransactionBlock for read-only operations
        const result = await suiClient.devInspectTransactionBlock({
          transactionBlock: tx,
          sender: account.address,
        });
  
        if (result.events && result.events.length > 0) {
          const idsEvent = result.events.find(e => 
            e.type.endsWith("::carbon_marketplace::OrganisationIDsEvent")
          );
          
          if (idsEvent && idsEvent.parsedJson) {
            interface OrganisationIDsEvent {
              ids: string[];
            }
            const orgIds = (idsEvent.parsedJson as OrganisationIDsEvent).ids;
            await fetchOrganizationDetails(orgIds);
          } else {
            setOrganizations([]);
          }
        } else {
          setOrganizations([]);
        }
      } catch (error) {
        console.error("Error fetching organizations:", error);
        setError(error instanceof Error ? error.message : "Failed to fetch organizations");
      } finally {
        setLoading(false);
      }
    };
  
    // Fetch details for each organization using devInspect
    const fetchOrganizationDetails = async (orgIds: string[]) => {
      if (!account || orgIds.length === 0) {
        setLoading(false);
        return;
      }
  
      try {
        const orgDetails: Organization[] = [];
  
        for (const orgId of orgIds) {
          try {
            const tx = new Transaction();
            
            tx.moveCall({
              target: `${PACKAGE_ID}::carbon_marketplace::get_organisation_details`,
              arguments: [
                tx.object(ORGANIZATION_HANDLER_ID),
                tx.pure.id(orgId),
              ],
            });
  
            // Use devInspect for read-only operations
            const result = await suiClient.devInspectTransactionBlock({
              transactionBlock: tx,
              sender: account.address,
            });
            
            if (result.events && result.events.length > 0) {
              const detailsEvent = result.events.find(e => 
                e.type.endsWith("::carbon_marketplace::OrganisationDetailsEvent")
              );
              
              if (detailsEvent && detailsEvent.parsedJson) {
                const parsed = detailsEvent.parsedJson as Organization;
              
                orgDetails.push({
                  organisation_id: parsed.organisation_id,
                  name: parsed.name,
                  carbon_credits: parsed.carbon_credits,
                  reputation_score: parsed.reputation_score,
                  owner: parsed.owner,
                });
              }
            }
          } catch (orgError) {
            console.error(`Error fetching details for org ${orgId}:`, orgError);
            // Continue with other organizations even if one fails
          }
        }
  
        setOrganizations(orgDetails);
      } catch (error) {
        console.error("Error fetching organization details:", error);
        setError(error instanceof Error ? error.message : "Failed to fetch organization details");
      }
    };
  
    // Submit lend request (this one uses signAndExecute because it's a write operation)
    const submitLendRequest = async () => {
      if (!account || !selectedOrg || !requestAmount) return;
  
      // Validate inputs
      const amount = Number(requestAmount);
      if (amount <= 0 || !Number.isInteger(amount)) {
        setError("Please enter a valid positive whole number for the amount");
        return;
      }
  
      setIsSubmitting(true);
      setError("");
  
      try {
        const tx = new Transaction();
        
        // Log the values being sent for debugging
        console.log("Submitting lend request with:", {
          orgId: selectedOrg.organisation_id,
          amount: requestAmount,
          duration: duration,
          lender: account.address,
          borrower: selectedOrg.owner
        });
        
        tx.moveCall({
          target: `${PACKAGE_ID}::carbon_marketplace::create_lend_request`,
          arguments: [
            tx.object(ORGANIZATION_HANDLER_ID),
            tx.object(CLOCK_OBJECT_ID),
            tx.object(LEND_REQUEST_HANDLER_ID),
            tx.pure.id(selectedOrg.organisation_id),
            tx.pure.u64(BigInt(requestAmount)),
            tx.pure.u64(BigInt(Math.floor(Date.now() / 1000))),
            tx.pure.u64(BigInt(duration)),
          ],
        });
  
        signAndExecute(
          { 
            transaction: tx
          },
          {
            onSuccess: async (txResponse) => {
              try {
                const txResult = await suiClient.waitForTransaction({ 
                  digest: txResponse.digest,
                  options: { 
                    showEvents: true,
                    showEffects: true 
                  }
                });
                
                const events = txResult.events || [];
                const requestEvent = events.find(e => 
                  e.type.endsWith("::carbon_marketplace::LendRequestCreated")
                );
                
                if (requestEvent) {
                  setSelectedOrg(null);
                  setRequestAmount("");
                  setDuration("604800");
                  // Refresh organizations list
                  await fetchOrganizations();
                }
              } catch (waitError) {
                console.error("Error waiting for transaction:", waitError);
                setError("Transaction submitted but confirmation failed");
              }
            },
            onError: (error) => {
              console.error("Transaction error:", error);
              setError(error.message || "Failed to create lend request");
            },
            onSettled: () => {
              setIsSubmitting(false);
            }
          }
        );
      } catch (error) {
        console.error("Submit error:", error);
        setError(error instanceof Error ? error.message : "Unknown error occurred");
        setIsSubmitting(false);
      }
    };
  
    // Auto-refresh on account change
    useEffect(() => {
      if (account) {
        fetchOrganizations();
      } else {
        setOrganizations([]);
        setError("");
      }
    }, [account]);
  
    // Helper functions
    const getReputationBadge = (score: number) => {
      if (score >= 80) return <Badge color="green">Excellent</Badge>;
      if (score >= 50) return <Badge color="yellow">Good</Badge>;
      return <Badge color="red">Needs Improvement</Badge>;
    };
  
    const formatDuration = (seconds: number) => {
      const days = Math.floor(seconds / 86400);
      return `${days} day${days !== 1 ? 's' : ''}`;
    };
  
    if (!account) {
      return (
        <Container size="3" my="4">
          <Flex justify="center" align="center" direction="column" gap="4" style={{ minHeight: "200px" }}>
            <Heading size="4">Lend Carbon Credits</Heading>
            <Text color="gray">Please connect your wallet to lend credits</Text>
          </Flex>
        </Container>
      );
    }
  
    return (
      <Container size="3" my="4">
        <Flex justify="between" align="center" mb="4">
          <Heading size="4">Lend Carbon Credits</Heading>
          <Button onClick={fetchOrganizations} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </Flex>
  
        {error && (
          <Card mb="4" style={{ borderColor: "var(--red-6)" }}>
            <Text color="red" size="2">
              <strong>Error:</strong> {error}
            </Text>
          </Card>
        )}
  
        {loading ? (
          <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
            <Text>Loading organizations...</Text>
          </Flex>
        ) : organizations.length === 0 ? (
          <Card>
            <Flex justify="center" align="center" direction="column" gap="2" style={{ minHeight: "200px" }}>
              <Text color="gray" size="3">No organizations available for lending</Text>
              <Text color="gray" size="1">Try refreshing or check back later</Text>
            </Flex>
          </Card>
        ) : (
          <Card>
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Organization</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Credits</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Reputation</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Action</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
  
              <Table.Body>
                {organizations.map((org) => (
                  <Table.Row key={org.organisation_id}>
                    <Table.Cell>
                      <Flex align="center" gap="2">
                        <Avatar
                          fallback={org.name.charAt(0)}
                          radius="full"
                          size="2"
                        />
                        <Box>
                          <Text weight="bold">{org.name}</Text>
                          <Text size="1" color="gray">
                            {org.owner.slice(0, 6)}...{org.owner.slice(-4)}
                          </Text>
                        </Box>
                      </Flex>
                    </Table.Cell>
                    <Table.Cell>
                      <Text weight="bold">{org.carbon_credits.toLocaleString()}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Flex align="center" gap="2">
                        {getReputationBadge(org.reputation_score)}
                        <Text size="1">({org.reputation_score})</Text>
                      </Flex>
                    </Table.Cell>
                    <Table.Cell>
                      <Button 
                        size="1" 
                        onClick={() => setSelectedOrg(org)}
                        disabled={org.owner === account.address || loading}
                        variant={org.owner === account.address ? "soft" : "solid"}
                      >
                        {org.owner === account.address ? "Your Organization" : "Lend Credits"}
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Card>
        )}
  
        {/* Lend Request Dialog */}
        <Dialog.Root open={!!selectedOrg} onOpenChange={(open) => !open && setSelectedOrg(null)}>
          <Dialog.Content style={{ maxWidth: 450 }}>
            {selectedOrg && (
              <>
                <Dialog.Title>
                  <Flex align="center" gap="2">
                    <Avatar
                      fallback={selectedOrg.name.charAt(0)}
                      radius="full"
                      size="2"
                    />
                    Lend to {selectedOrg.name}
                  </Flex>
                </Dialog.Title>
                
                <Box mb="4">
                  <Text weight="bold">Organization Details:</Text>
                  <Box mt="2" mb="2">
                    <Text size="1" color="gray">Available Credits: </Text>
                    <Text weight="bold">{selectedOrg.carbon_credits.toLocaleString()}</Text>
                  </Box>
                  <Box mb="2">
                    <Text size="1" color="gray">Reputation: </Text>
                    <Flex align="center" gap="2" display="inline-flex">
                      {getReputationBadge(selectedOrg.reputation_score)}
                      <Text size="1">{selectedOrg.reputation_score}/100</Text>
                    </Flex>
                  </Box>
                </Box>
  
                <Box mb="3">
                  <Text size="2" weight="bold" mb="1">Amount to Lend:</Text>
                  <TextField.Root
                    placeholder="Enter amount"
                    value={requestAmount}
                    onChange={(e) => setRequestAmount(e.target.value)}
                    type="number"
                    min="1"
                  />
                </Box>
  
                <Box mb="4">
                  <Text size="2" weight="bold" mb="1">Lending Duration:</Text>
                  <Select.Root 
                    value={duration}
                    onValueChange={setDuration}
                  >
                  <Select.Trigger />
                  <Select.Content>
                    <Select.Item value="86400">1 Day</Select.Item>
                    <Select.Item value="259200">3 Days</Select.Item>
                    <Select.Item value="604800">7 Days</Select.Item>
                    <Select.Item value="1209600">14 Days</Select.Item>
                    <Select.Item value="2592000">30 Days</Select.Item>
                  </Select.Content>
                  </Select.Root>
                </Box>
  
                <Text size="1" color="gray" mb="3">
                  Lending period: {formatDuration(Number(duration))}
                </Text>
  
                <Flex gap="3" mt="4" justify="end">
                  <Dialog.Close>
                    <Button variant="soft" color="gray" disabled={isSubmitting}>
                      Cancel
                    </Button>
                  </Dialog.Close>
                  <Button 
                    onClick={submitLendRequest}
                    disabled={!requestAmount || isSubmitting || Number(requestAmount) <= 0}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Lend Request"}
                  </Button>
                </Flex>
              </>
            )}
          </Dialog.Content>
        </Dialog.Root>
      </Container>
    );
  }