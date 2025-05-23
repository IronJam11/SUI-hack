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
  Grid,
  Avatar,
  Code
} from "@radix-ui/themes";
import { useState, useEffect } from "react";

// Replace with your actual package ID and handler object ID
const ORGANIZATION_HANDLER_ID = "0x3e93f9c3174505789f34825c4833e59adeb9b3f68adb8bfd53ecdcf0b61b75db";
const PACKAGE_ID = "0x0514cb5817179ac60a31c8b552c252928745a35048e189e0a857ea2a8487000a";

type Organization = {
  organisation_id: string;
  name: string;
  description: string;
  owner: string;
  carbon_credits: number;
  reputation_score: number;
  times_lent: number;
  total_lent: number;
  times_borrowed: number;
  total_borrowed: number;
  total_returned: number;
  times_returned: number;
  emissions: number;
  wallet_address: string;
};

export function OrganizationDirectory() {
  const account = useCurrentAccount();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  const suiClient = useSuiClient();

  // Query the handler object to get organization data
  const { data: handlerObject, refetch } = useSuiClientQuery("getObject", {
    id: ORGANIZATION_HANDLER_ID,
    options: { 
      showContent: true,
      showOwner: true 
    }
  });

  // Extract organizations from the handler object
  useEffect(() => {
    const loadOrganizations = async () => {
      if (!handlerObject?.data?.content || handlerObject.data.content.dataType !== "moveObject") {
        return;
      }

      try {
        const handlerFields = handlerObject.data.content.fields as any;
        
        // Set debug info to see the actual structure
        setDebugInfo({
          handlerFields: handlerFields,
          fullObject: handlerObject.data
        });
        
        // Extract organizations from the embedded VecMap
        const organizations: Organization[] = [];
        
        if (handlerFields.organisations?.fields?.contents) {
          const orgEntries = handlerFields.organisations.fields.contents;
          
          for (const entry of orgEntries) {
            if (entry.fields?.value?.fields) {
              const orgFields = entry.fields.value.fields;
              
              const org: Organization = {
                organisation_id: orgFields.id?.id || entry.fields.key,
                name: orgFields.name || "Unknown",
                description: orgFields.description || "No description",
                owner: orgFields.owner || "Unknown",
                wallet_address: orgFields.wallet_address || orgFields.owner || "Unknown",
                carbon_credits: parseInt(orgFields.carbon_credits?.toString() || "0"),
                reputation_score: parseInt(orgFields.reputation_score?.toString() || "0"),
                times_lent: parseInt(orgFields.times_lent?.toString() || "0"),
                total_lent: parseInt(orgFields.total_lent?.toString() || "0"),
                times_borrowed: parseInt(orgFields.times_borrowed?.toString() || "0"),
                total_borrowed: parseInt(orgFields.total_borrowed?.toString() || "0"),
                total_returned: parseInt(orgFields.total_returned?.toString() || "0"),
                times_returned: parseInt(orgFields.times_returned?.toString() || "0"),
                emissions: parseInt(orgFields.emissions?.toString() || "0")
              };
              
              organizations.push(org);
            }
          }
        }
        
        console.log("Extracted organizations:", organizations);
        setOrganizations(organizations);
        
        if (organizations.length === 0) {
          setError("No organizations found in handler object");
        }
      } catch (error) {
        console.error("Error processing handler object:", error);
        setError(`Error loading organizations: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    if (account) {
      loadOrganizations();
    }
  }, [account, handlerObject]);

  // Manual refresh function
  const handleRefresh = async () => {
    setError("");
    await refetch();
  };

  // Helper functions
  const getReputationBadge = (score: number) => {
    if (score >= 80) return <Badge color="green">Excellent</Badge>;
    if (score >= 50) return <Badge color="yellow">Good</Badge>;
    return <Badge color="red">Needs Improvement</Badge>;
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Container size="3" my="4">
      <Flex justify="between" align="center" mb="4">
        <Heading size="4">Organization Directory</Heading>
        <Flex gap="2">
          <Button 
            variant="outline" 
            onClick={() => setShowDebug(!showDebug)}
            size="1"
          >
            {showDebug ? "Hide Debug" : "Show Debug"}
          </Button>
          <Button onClick={handleRefresh} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </Flex>
      </Flex>

      {/* Debug Information */}
      {showDebug && debugInfo && (
        <Card mb="3" style={{ backgroundColor: "", border: "1px solid #ccc" }}>
          <Text weight="bold" mb="2">Debug Information:</Text>
          <Text size="1" style={{ fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
            {JSON.stringify(debugInfo, null, 2)}
          </Text>
        </Card>
      )}

      {error && (
        <Card mb="3" style={{ backgroundColor: "#fee", border: "1px solid #fcc" }}>
          <Text color="red">Error: {String(error)}</Text>
          <Button 
            size="1" 
            variant="ghost" 
            onClick={() => setError("")}
            style={{ marginTop: "8px" }}
          >
            Dismiss
          </Button>
        </Card>
      )}

      {!account ? (
        <Text color="gray">Please connect your wallet to view organizations</Text>
      ) : loading ? (
        <Text color="gray">Loading organizations...</Text>
      ) : organizations.length === 0 ? (
        <Box>
          <Text color="gray">No organizations found</Text>
          <Text size="1" color="gray" mt="2">
            Organizations are loaded directly from the handler object. 
            Check the debug info to see the structure.
          </Text>
        </Box>
      ) : (
        <>
          <Text size="2" color="gray" mb="3">
            Found {organizations.length} organization{organizations.length !== 1 ? 's' : ''}
          </Text>
          <Card>
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Organization</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Credits</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Reputation</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Activity</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
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
                            {formatAddress(org.owner)}
                          </Text>
                        </Box>
                      </Flex>
                    </Table.Cell>
                    <Table.Cell>
                      <Text weight="bold">{org.carbon_credits}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Flex align="center" gap="2">
                        {getReputationBadge(org.reputation_score)}
                        <Text>({org.reputation_score})</Text>
                      </Flex>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="1">
                        Lent: {org.times_lent} times
                        <br />
                        Borrowed: {org.times_borrowed} times
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Button 
                        size="1" 
                        onClick={() => setSelectedOrg(org)}
                      >
                        View Details
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Card>
        </>
      )}

      {/* Organization Details Modal */}
      <Dialog.Root open={!!selectedOrg} onOpenChange={(open) => !open && setSelectedOrg(null)}>
        <Dialog.Content style={{ maxWidth: 600 }}>
          {selectedOrg && (
            <>
              <Dialog.Title>
                <Flex align="center" gap="2">
                  <Avatar
                    fallback={selectedOrg.name.charAt(0)}
                    radius="full"
                    size="3"
                  />
                  {selectedOrg.name}
                </Flex>
              </Dialog.Title>
              
              <Box mb="4">
                <Text weight="bold">Description:</Text>
                <Text>{selectedOrg.description}</Text>
              </Box>

              <Grid columns="3" gap="3" mb="4">
                <Box>
                  <Text weight="bold">Owner:</Text>
                  <Text>{formatAddress(selectedOrg.owner)}</Text>
                </Box>
                <Box>
                  <Text weight="bold">Wallet Address:</Text>
                  <Text>{formatAddress(selectedOrg.wallet_address)}</Text>
                </Box>
                <Box>
                  <Text weight="bold">Carbon Credits:</Text>
                  <Text>{selectedOrg.carbon_credits}</Text>
                </Box>
                <Box>
                  <Text weight="bold">Reputation Score:</Text>
                  <Flex align="center" gap="2">
                    {getReputationBadge(selectedOrg.reputation_score)}
                    <Text>{selectedOrg.reputation_score}/100</Text>
                  </Flex>
                </Box>
                <Box>
                  <Text weight="bold">Times Lent:</Text>
                  <Text>{selectedOrg.times_lent}</Text>
                </Box>
                <Box>
                  <Text weight="bold">Total Lent:</Text>
                  <Text>{selectedOrg.total_lent}</Text>
                </Box>
                <Box>
                  <Text weight="bold">Total Returned:</Text>
                  <Text>{selectedOrg.total_returned}</Text>
                </Box>
                <Box>
                  <Text weight="bold">Times Borrowed:</Text>
                  <Text>{selectedOrg.times_borrowed}</Text>
                </Box>
                <Box>
                  <Text weight="bold">Total Borrowed:</Text>
                  <Text>{selectedOrg.total_borrowed}</Text>
                </Box>
                <Box>
                  <Text weight="bold">Emissions:</Text>
                  <Text>{selectedOrg.emissions}</Text>
                </Box>
              </Grid>

              <Flex gap="3" mt="4" justify="end">
                <Dialog.Close>
                  <Button variant="soft" color="gray">
                    Close
                  </Button>
                </Dialog.Close>
              </Flex>
            </>
          )}
        </Dialog.Content>
      </Dialog.Root>
    </Container>
  );
}