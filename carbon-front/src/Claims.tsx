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
    Separator,
    Dialog,
    AlertDialog,
    Grid
  } from "@radix-ui/themes";
  import { useState, useEffect } from "react";
  import { formatDistanceToNow } from 'date-fns';
  
  // Replace with your actual package IDs
  const ORGANIZATION_HANDLER_ID = "0x3e93f9c3174505789f34825c4833e59adeb9b3f68adb8bfd53ecdcf0b61b75db";
  const CLAIM_HANDLER_ID = "0x9dfc31fa670a2722a806be47eef3fd02b98db35d8c6910a2ef9a2868793a6225";
  const PACKAGE_ID = "0x0514cb5817179ac60a31c8b552c252928745a35048e189e0a857ea2a8487000a";
  const CLOCK_OBJECT_ID = "0x6"; // Standard Sui Clock
  
  type ClaimView = {
    claim_id: string;
    organisation_wallet_address: string;
    longitude: number;
    latitude: number;
    requested_carbon_credits: number;
    status: number;
    ipfs_hash: string;
    description: string;
    time_of_issue: number;
    yes_votes: number;
    no_votes: number;
    total_votes: number;
    voting_period: number;
  };
  
  export function ClaimsList() {
    const account = useCurrentAccount();
    const [claims, setClaims] = useState<ClaimView[]>([]); // Initialize as empty array
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [selectedClaim, setSelectedClaim] = useState<ClaimView | null>(null);
    const [voteDialogOpen, setVoteDialogOpen] = useState(false);
    const [voteType, setVoteType] = useState<"yes" | "no">("yes");
    const [voteProcessing, setVoteProcessing] = useState(false);
    const [hasInitialLoad, setHasInitialLoad] = useState(false);
    const [debugMode, setDebugMode] = useState(true); // Show debug info initially
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();
    const suiClient = useSuiClient();
  
    // Use Sui client query to get the ClaimHandler object
    const { data: claimsData, refetch: refetchClaims } = useSuiClientQuery(
      "getObject",
      {
        id: CLAIM_HANDLER_ID,
        options: {
          showContent: true,
          showOwner: true,
          showType: true,
        },
      },
      {
        enabled: !!account,
      }
    );
  
    // Parse claims from the ClaimHandler object
    useEffect(() => {
      if (claimsData?.data?.content && 'fields' in claimsData.data.content) {
        try {
          const fields = claimsData.data.content.fields as any;
          
          // Extract claims from the ClaimHandler's claims field
          // The structure depends on how your Move struct is defined
          // Common patterns:
          
          // If claims is stored as a VecMap or Table, you might need to extract the values
          if (fields.claims && fields.claims.fields) {
            // For VecMap structure
            if (fields.claims.fields.contents) {
              const claimsArray: ClaimView[] = [];
              const contents = fields.claims.fields.contents;
              
              // VecMap stores key-value pairs
              if (Array.isArray(contents)) {
                contents.forEach((entry: any) => {
                  if (entry.fields && entry.fields.value && entry.fields.value.fields) {
                    const claimFields = entry.fields.value.fields;
                    claimsArray.push({
                      claim_id: entry.fields.key,
                      organisation_wallet_address: claimFields.organisation_wallet_address,
                      longitude: parseFloat(claimFields.longitude),
                      latitude: parseFloat(claimFields.latitude),
                      requested_carbon_credits: parseInt(claimFields.requested_carbon_credits),
                      status: parseInt(claimFields.status),
                      ipfs_hash: claimFields.ipfs_hash,
                      description: claimFields.description,
                      time_of_issue: parseInt(claimFields.time_of_issue),
                      yes_votes: parseInt(claimFields.yes_votes),
                      no_votes: parseInt(claimFields.no_votes),
                      total_votes: parseInt(claimFields.total_votes),
                      voting_period: parseInt(claimFields.voting_period)
                    });
                  }
                });
              }
              setClaims(claimsArray);
            }
          }
          // If it's a different structure, you might need to adjust accordingly
          else if (Array.isArray(fields.claims)) {
            // Direct array of claims
            setClaims(fields.claims);
          }
          
          setHasInitialLoad(true);
        } catch (err) {
          console.error("Error parsing claims data:", err);
          setError("Failed to parse claims data from object query");
          setClaims([]); // Ensure it's always an array
        }
      } else {
        // If no data is available from the object query, ensure claims is an empty array
        setClaims([]);
      }
    }, [claimsData]);
  
    // Fetch claims using the Move function (this is the reliable method)
    const fetchClaimsWithTransaction = async () => {
      if (!account) return;
  
      setLoading(true);
      setError("");
  
      try {
        const tx = new Transaction();
        
        tx.moveCall({
          target: `${PACKAGE_ID}::carbon_marketplace::get_all_claims`,
          arguments: [
            tx.object(ORGANIZATION_HANDLER_ID),
            tx.object(CLAIM_HANDLER_ID),
            tx.object(CLOCK_OBJECT_ID),
          ],
        });
  
        signAndExecute(
          { 
            transaction: tx
          },
          {
            onSuccess: async (txResponse) => {
              const txResult = await suiClient.waitForTransaction({ 
                digest: txResponse.digest,
                options: { 
                  showEvents: true,
                  showEffects: true 
                }
              });
              
              const events = txResult.events || [];
              const claimsEvent = events.find(e => 
                e.type.endsWith("::carbon_marketplace::AllClaimsEvent")
              );
              
              if (claimsEvent && claimsEvent.parsedJson) {
                const eventData = claimsEvent.parsedJson as { claims: ClaimView[] };
                if (Array.isArray(eventData.claims)) {
                  setClaims(eventData.claims);
                  setHasInitialLoad(true);
                } else {
                  setClaims([]);
                  setError("Received invalid claims data format");
                }
              } else {
                setClaims([]);
                setError("No claims event found in transaction result");
              }
              setLoading(false);
            },
            onError: (error) => {
              setError(error.message || "Failed to fetch claims");
              setClaims([]); // Ensure it's always an array
              setLoading(false);
            }
          }
        );
      } catch (error) {
        setError(error instanceof Error ? error.message : "Unknown error");
        setClaims([]); // Ensure it's always an array
        setLoading(false);
      }
    };
  
    // Submit vote using the new vote_on_a_claim function
    const submitVote = async () => {
      if (!account || !selectedClaim) return;
      
      // Double-check voting is still active before submitting
      if (!isVotingActive(selectedClaim)) {
        setError("Voting period has expired for this claim");
        setVoteDialogOpen(false);
        return;
      }
  
      setVoteProcessing(true);
      setError("");
  
      try {
        const tx = new Transaction();
        
        // Convert vote type to number: 1 for yes, 0 for no
        const voteValue = voteType === "yes" ? 1 : 0;
        
        tx.moveCall({
          target: `${PACKAGE_ID}::carbon_marketplace::vote_on_a_claim`,
          arguments: [
            tx.object(CLAIM_HANDLER_ID),
            tx.object(CLOCK_OBJECT_ID),
            tx.object(selectedClaim.claim_id),
            tx.pure.u64(voteValue),
          ],
        });
  
        signAndExecute(
          { 
            transaction: tx,
          },
          {
            onSuccess: async (txResponse) => {
              // Wait for transaction completion and check for events
              const txResult = await suiClient.waitForTransaction({ 
                digest: txResponse.digest,
                options: { 
                  showEvents: true,
                  showEffects: true 
                }
              });
              
              // Look for the ClaimVoted event
              const events = txResult.events || [];
              const voteEvent = events.find(e => 
                e.type.endsWith("::carbon_marketplace::ClaimVoted")
              );
              
              if (voteEvent && voteEvent.parsedJson) {
                console.log("Vote recorded:", voteEvent.parsedJson);
              }
              
              setVoteDialogOpen(false);
              setSelectedClaim(null);
              
              // Refresh claims after voting
              await fetchClaimsWithTransaction();
              setVoteProcessing(false);
            },
            onError: (error) => {
              let errorMessage = error.message || "Vote failed";
              
              // Parse common Move abort codes for better user feedback
              if (errorMessage.includes("MoveAbort") && errorMessage.includes(", 1)")) {
                errorMessage = "Voting period has expired for this claim";
              } else if (errorMessage.includes("MoveAbort") && errorMessage.includes(", 2)")) {
                errorMessage = "You have already voted on this claim";
              } else if (errorMessage.includes("MoveAbort") && errorMessage.includes(", 0)")) {
                errorMessage = "Claim not found or invalid";
              }
              
              setError(errorMessage);
              setVoteProcessing(false);
            }
          }
        );
      } catch (error) {
        setError(error instanceof Error ? error.message : "Unknown error");
        setVoteProcessing(false);
      }
    };
  
    // Helper functions
    const getStatusBadge = (status: number) => {
      switch(status) {
        case 0: return <Badge color="orange">Voting</Badge>;
        case 1: return <Badge color="green">Approved</Badge>;
        case 2: return <Badge color="red">Rejected</Badge>;
        default: return <Badge color="gray">Unknown</Badge>;
      }
    };
  
    const getVotingEndTime = (claim: ClaimView) => {
      // Handle both milliseconds and seconds timestamps
      const timeInMs = claim.time_of_issue > 1000000000000 ? claim.time_of_issue : claim.time_of_issue * 1000;
      const periodInMs = claim.voting_period > 1000000000 ? claim.voting_period : claim.voting_period * 1000;
      const endTime = new Date(timeInMs + periodInMs);
      
      // Debug logging
      console.log("Claim voting details:", {
        claim_id: claim.claim_id,
        time_of_issue: claim.time_of_issue,
        voting_period: claim.voting_period,
        timeInMs,
        periodInMs,
        endTime: endTime.toISOString(),
        now: new Date().toISOString()
      });
      
      return formatDistanceToNow(endTime, { addSuffix: true });
    };
    
    const isVotingActive = (claim: ClaimView) => {
      const now = Date.now();
      
      // Handle both milliseconds and seconds timestamps
      const timeInMs = claim.time_of_issue > 1000000000000 ? claim.time_of_issue : claim.time_of_issue * 1000;
      const periodInMs = claim.voting_period > 1000000000 ? claim.voting_period : claim.voting_period * 1000;
      const votingEndTime = timeInMs + periodInMs;
      
      const isActive = now <= votingEndTime;
      
      // Debug logging
      console.log("Voting active check:", {
        claim_id: claim.claim_id,
        now: new Date(now).toISOString(),
        votingEndTime: new Date(votingEndTime).toISOString(),
        isActive,
        timeRemaining: votingEndTime - now
      });
      
      return isActive;
    };
  
    const canVote = (claim: ClaimView) => {
      if (!account) return false;
      if (claim.organisation_wallet_address === account.address) return false;
      if (claim.status !== 0) return false;
      return isVotingActive(claim);
    };
  
    return (
      <Container size="3" my="4">
        <Flex justify="between" align="center" mb="4">
          <Heading size="4">Carbon Credit Claims</Heading>
          <Flex gap="2">
            <Button onClick={() => setDebugMode(!debugMode)} variant="soft" size="1">
              {debugMode ? "Hide Debug" : "Show Debug"}
            </Button>
            <Button onClick={() => refetchClaims()} disabled={loading}>
              {loading ? "Loading..." : "Refresh Object Query"}
            </Button>
            <Button onClick={fetchClaimsWithTransaction} disabled={loading} variant="outline">
              {loading ? "Processing..." : "Fetch with Transaction"}
            </Button>
          </Flex>
        </Flex>
  
        {error && (
          <Card style={{ backgroundColor: '#fef2f2', padding: '1rem', marginBottom: '1rem' }}>
            <Text color="red">
              <strong>Error:</strong> {error}
            </Text>
          </Card>
        )}
  
  {!account ? (
  <Card>
    <Text color="gray">Please connect your wallet to view claims</Text>
  </Card>
) : loading ? (
  <Card>
    <Flex align="center" justify="center" py="4">
      <Text>Loading claims...</Text>
    </Flex>
  </Card>
) : !Array.isArray(claims) || claims.length === 0 ? (
  <Card>
    <Flex direction="column" align="center" justify="center" py="4" gap="2">
      <Text color="gray">No claims found</Text>
      {!hasInitialLoad && (
        <Text size="1" color="gray">
          Click "Fetch with Transaction" to load claims from the blockchain
        </Text>
      )}
    </Flex>
  </Card>
) : (
  <>
            {/* Debug info */}
            {debugMode && (
              <Card style={{ backgroundColor: '#f8f9fa', padding: '1rem', marginBottom: '1rem' }}>
                <Text size="1" color="gray">
                  Debug: Found {claims.length} claims. Current time: {new Date().toISOString()}
                </Text>
                {claims.length > 0 && (
                  <Text size="1" color="gray">
                    <br />Sample claim timestamps - ID: {claims[0].claim_id}, 
                    time_of_issue: {claims[0].time_of_issue}, 
                    voting_period: {claims[0].voting_period}
                  </Text>
                )}
              </Card>
            )}
            
            <Card>
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Credits</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Votes</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Voting Ends</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
  
              <Table.Body>
                {claims.map((claim) => (
                  <Table.Row key={claim.claim_id}>
                    <Table.Cell>{getStatusBadge(claim.status)}</Table.Cell>
                    <Table.Cell>
                      <Text weight="bold">{claim.description}</Text>
                      <br />
                      <Text size="1" color="gray">
                        IPFS: {claim.ipfs_hash}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>{claim.requested_carbon_credits}</Table.Cell>
                    <Table.Cell>
                      <Text size="1">
                        <span style={{ color: 'green' }}>✓ {claim.yes_votes}</span>
                        {' / '}
                        <span style={{ color: 'red' }}>✗ {claim.no_votes}</span>
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      {claim.status === 0 ? (
                        <Box>
                          <Text size="1">
                            {getVotingEndTime(claim)}
                          </Text>
                          <br />
                          <Badge color={isVotingActive(claim) ? "green" : "red"} size="1">
                            {isVotingActive(claim) ? "Active" : "Expired"}
                          </Badge>
                        </Box>
                      ) : "Closed"}
                    </Table.Cell>
                    <Table.Cell>
                      {canVote(claim) ? (
                        <Flex gap="2">
                          <Button 
                            size="1" 
                            onClick={() => {
                              setSelectedClaim(claim);
                              setVoteType("yes");
                              setVoteDialogOpen(true);
                            }}
                          >
                            Vote Yes
                          </Button>
                          <Button 
                            size="1" 
                            color="red"
                            onClick={() => {
                              setSelectedClaim(claim);
                              setVoteType("no");
                              setVoteDialogOpen(true);
                            }}
                          >
                            Vote No
                          </Button>
                        </Flex>
                      ) : account && claim.organisation_wallet_address === account.address ? (
                        <Text size="1" color="gray">Your claim</Text>
                      ) : !isVotingActive(claim) ? (
                        <Text size="1" color="orange">Voting expired</Text>
                      ) : claim.status !== 0 ? (
                        <Text size="1" color="gray">
                          {claim.status === 1 ? "Approved" : "Rejected"}
                        </Text>
                      ) : (
                        <Text size="1" color="gray">Voting closed</Text>
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Card>
        </>
        )}
  
        {/* Claim Details Modal */}
        <Dialog.Root open={!!selectedClaim && !voteDialogOpen} onOpenChange={(open) => !open && setSelectedClaim(null)}>
          <Dialog.Content style={{ maxWidth: 450 }}>
            {selectedClaim && (
              <>
                <Dialog.Title>Claim Details</Dialog.Title>
                
                <Box mb="4">
                  <Text weight="bold">Description:</Text>
                  <br />
                  <Text>{selectedClaim.description}</Text>
                </Box>
  
                <Grid columns="2" gap="3" mb="4">
                  <Box>
                    <Text weight="bold">Location:</Text>
                    <br />
                    <Text>{selectedClaim.longitude}, {selectedClaim.latitude}</Text>
                  </Box>
                  <Box>
                    <Text weight="bold">Credits:</Text>
                    <br />
                    <Text>{selectedClaim.requested_carbon_credits}</Text>
                  </Box>
                  <Box>
                    <Text weight="bold">Status:</Text>
                    <br />
                    {getStatusBadge(selectedClaim.status)}
                  </Box>
                  <Box>
                    <Text weight="bold">Voting Status:</Text>
                    <br />
                    <Flex align="center" gap="2">
                      <Text>{getVotingEndTime(selectedClaim)}</Text>
                      <Badge color={isVotingActive(selectedClaim) ? "green" : "red"} size="1">
                        {isVotingActive(selectedClaim) ? "Active" : "Expired"}
                      </Badge>
                    </Flex>
                  </Box>
                </Grid>
  
                <Separator my="4" />
  
                <Box mb="4">
                  <Text weight="bold">Current Votes:</Text>
                  <br />
                  <Flex gap="4">
                    <Text>
                      <span style={{ color: 'green' }}>✓ Yes: {selectedClaim.yes_votes}</span>
                    </Text>
                    <Text>
                      <span style={{ color: 'red' }}>✗ No: {selectedClaim.no_votes}</span>
                    </Text>
                    <Text color="gray">
                      Total: {selectedClaim.total_votes}
                    </Text>
                  </Flex>
                </Box>
  
                {selectedClaim.status !== 0 && (
                  <Box>
                    <Text weight="bold">Final Result:</Text>
                    <br />
                    <Text>
                      {selectedClaim.status === 1 ? "✅ Approved" : "❌ Rejected"} with{' '}
                      {selectedClaim.yes_votes} Yes and {selectedClaim.no_votes} No votes
                    </Text>
                  </Box>
                )}
  
                <Flex gap="3" mt="4" justify="end">
                  <Dialog.Close>
                    <Button variant="soft" color="gray">
                      Closea
                    </Button>
                  </Dialog.Close>
                </Flex>
              </>
            )}
          </Dialog.Content>
        </Dialog.Root>
  
        {/* Vote Confirmation Dialog */}
        <AlertDialog.Root open={voteDialogOpen} onOpenChange={setVoteDialogOpen}>
          <AlertDialog.Content style={{ maxWidth: 450 }}>
            <AlertDialog.Title>Confirm Your Vote</AlertDialog.Title>
            <AlertDialog.Description>
              <Box mb="3">
                You are about to vote <strong>{voteType === "yes" ? "YES" : "NO"}</strong> on this claim:
              </Box>
              {selectedClaim && (
                <Box mb="3">
                  <Text weight="bold">"{selectedClaim.description}"</Text>
                  <br />
                  <Text size="1" color="gray">
                    {selectedClaim.requested_carbon_credits} carbon credits requested
                  </Text>
                </Box>
              )}
              <Text color="orange">
                This action cannot be undone.
              </Text>
            </AlertDialog.Description>
  
            <Flex gap="3" mt="4" justify="end">
              <AlertDialog.Cancel>
                <Button variant="soft" color="gray" disabled={voteProcessing}>
                  Cancel
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action>
                <Button 
                  color={voteType === "yes" ? "green" : "red"}
                  onClick={submitVote}
                  disabled={voteProcessing}
                >
                  {voteProcessing ? "Processing..." : `Vote ${voteType === "yes" ? "Yes" : "No"}`}
                </Button>
              </AlertDialog.Action>
            </Flex>
          </AlertDialog.Content>
        </AlertDialog.Root>
      </Container>
    );
  }