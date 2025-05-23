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
  TextField, 
  TextArea,
  Card,
  Table
} from "@radix-ui/themes";
import { useState, useEffect, useCallback } from "react";
import ClipLoader from "react-spinners/ClipLoader";

// Replace with your actual package ID and handler object ID
const ORGANIZATION_HANDLER_ID = "0x3e93f9c3174505789f34825c4833e59adeb9b3f68adb8bfd53ecdcf0b61b75db";
const PACKAGE_ID = "0x0514cb5817179ac60a31c8b552c252928745a35048e189e0a857ea2a8487000a";

export function OrganisationProfile() {
  const account = useCurrentAccount();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  const [orgDetails, setOrgDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();

  // Error boundary to prevent page crashes
  const handleError = useCallback((error: any, context: string) => {
    console.error(`Error in ${context}:`, error);
    setError(`${context}: ${error?.message || error?.toString() || 'Unknown error'}`);
    setLoading(false);
  }, []);

  // Check if organization exists for current wallet
  const { data: handlerObject } = useSuiClientQuery("getObject", {
    id: ORGANIZATION_HANDLER_ID,
    options: { showContent: true }
  });

  // Check registration status on load
  useEffect(() => {
    try {
      if (account && handlerObject?.data?.content?.dataType === "moveObject") {
        const handlerFields = handlerObject.data.content.fields as any;
        const orgMap = handlerFields.wallet_addressToOrg?.fields?.contents || [];
        const isRegistered = orgMap.some((item: any) => 
          item.fields.key === account.address
        );
        setIsRegistered(isRegistered);
      }
    } catch (error) {
      handleError(error, "Checking registration status");
    }
  }, [account, handlerObject, handleError]);

  // Register new organization
  const registerOrganization = useCallback(async () => {
    try {
      if (!account) {
        setError("No account connected");
        return;
      }

      if (!name.trim() || !description.trim()) {
        setError("Please fill in both name and description");
        return;
      }

      console.log("Starting registration process...");
      console.log("Account:", account.address);
      console.log("Name:", name);
      console.log("Description:", description);

      setLoading(true);
      setError("");
      setSuccess("");

      const tx = new Transaction();
      
      tx.moveCall({
        target: `${PACKAGE_ID}::carbon_marketplace::register_organisation`,
        arguments: [
          tx.object(ORGANIZATION_HANDLER_ID),
          tx.pure.string(name.trim()),
          tx.pure.string(description.trim()),
        ],
      });

      console.log("Transaction created, attempting to sign...");

      // Wrap signAndExecute in a Promise to handle it safely
      const executeTransaction = () => {
        return new Promise((resolve, reject) => {
          signAndExecute(
            { transaction: tx },
            {
              onSuccess: (result) => {
                console.log("Transaction successful:", result);
                resolve(result);
              },
              onError: (error) => {
                console.error("Transaction failed:", error);
                reject(error);
              }
            }
          );
        });
      };

      const result = await executeTransaction() as any;
      
      // Wait for transaction with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Transaction timeout')), 30000)
      );
      
      const txPromise = suiClient.waitForTransaction({ 
        digest: result.digest,
        options: { 
          showEvents: true,
          showEffects: true 
        }
      });

      const txResponse = await Promise.race([txPromise, timeoutPromise]);
      console.log("Transaction confirmed:", txResponse);
      
      const events = (txResponse as any).events || [];
      const orgEvent = events.find((e: any) => 
        e.type.endsWith("::carbon_marketplace::OrganisationCreated")
      );
      
      if (orgEvent) {
        console.log("Organization created event found:", orgEvent);
        setIsRegistered(true);
        setSuccess("Organization registered successfully!");
        setName("");
        setDescription("");
        
        // Try to fetch details, but don't fail if it doesn't work
        setTimeout(() => {
          fetchOrganizationDetails().catch(err => 
            console.warn("Couldn't fetch details immediately:", err)
          );
        }, 2000);
      } else {
        console.log("No organization created event found");
        console.log("All events:", events);
        setSuccess("Transaction completed - please refresh to see your organization");
      }
    } catch (error) {
      handleError(error, "Registration");
    } finally {
      setLoading(false);
    }
  }, [account, name, description, signAndExecute, suiClient, handleError]);

  // Fetch organization details
  const fetchOrganizationDetails = useCallback(async () => {
    if (!account) return;

    try {
      console.log("Fetching organization details...");
      setError("");

      const tx = new Transaction();
      
      tx.moveCall({
        target: `${PACKAGE_ID}::carbon_marketplace::get_my_organisation_details`,
        arguments: [
          tx.object(ORGANIZATION_HANDLER_ID),
        ],
      });

      // Wrap in Promise like registration
      const executeTransaction = () => {
        return new Promise((resolve, reject) => {
          signAndExecute(
            { transaction: tx },
            {
              onSuccess: (result) => resolve(result),
              onError: (error) => reject(error)
            }
          );
        });
      };

      const result = await executeTransaction() as any;
      
      const txResponse = await suiClient.waitForTransaction({ 
        digest: result.digest,
        options: { 
          showEvents: true,
          showEffects: true 
        }
      });
      
      const events = txResponse.events || [];
      const detailsEvent = events.find((e: any) => 
        e.type.endsWith("::carbon_marketplace::OrganisationDetailsEvent")
      );
      
      if (detailsEvent) {
        console.log("Organization details:", detailsEvent.parsedJson);
        setOrgDetails(detailsEvent.parsedJson);
      } else {
        console.log("No details event found");
        setError("Organization details not found");
      }
    } catch (error) {
      handleError(error, "Fetching details");
    }
  }, [account, signAndExecute, suiClient, handleError]);

  // Debug information
  const debugInfo = () => {
    console.log("Debug Info:");
    console.log("Account:", account);
    console.log("Handler Object:", handlerObject);
    console.log("Is Registered:", isRegistered);
    console.log("Package ID:", PACKAGE_ID);
    console.log("Handler ID:", ORGANIZATION_HANDLER_ID);
  };

  return (
    <Container my="4">
      <Heading mb="4">Organization Profile</Heading>

      {/* Debug button */}
      <Button onClick={debugInfo} variant="ghost" size="1" mb="2">
        Debug Info (Check Console)
      </Button>

      {error && (
        <Card mb="3" style={{ backgroundColor: "#fee", border: "1px solid #fcc" }}>
          <Text color="red">Error: {error}</Text>
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

      {success && (
        <Card mb="3" style={{ backgroundColor: "#efe", border: "1px solid #cfc" }}>
          <Text color="green">✓ {success}</Text>
          <Button 
            size="1" 
            variant="ghost" 
            onClick={() => setSuccess("")}
            style={{ marginTop: "8px" }}
          >
            Dismiss
          </Button>
        </Card>
      )}

      {!account ? (
        <Text>Please connect your wallet to view or register your organization</Text>
      ) : isRegistered ? (
        <Card>
          <Heading size="4">Your Organization</Heading>
          
          {orgDetails ? (
            <Table.Root>
              <Table.Body>
                <Table.Row>
                  <Table.Cell>Name</Table.Cell>
                  <Table.Cell>{orgDetails.name}</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>Description</Table.Cell>
                  <Table.Cell>{orgDetails.description}</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>Carbon Credits</Table.Cell>
                  <Table.Cell>{orgDetails.carbon_credits}</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>Reputation Score</Table.Cell>
                  <Table.Cell>{orgDetails.reputation_score}</Table.Cell>
                </Table.Row>
              </Table.Body>
            </Table.Root>
          ) : (
            <Flex direction="column" gap="2">
              <Text>Loading organization details...</Text>
              <Button 
                onClick={fetchOrganizationDetails}
                disabled={loading}
              >
                {loading ? <ClipLoader size={16} /> : "Refresh Details"}
              </Button>
            </Flex>
          )}
        </Card>
      ) : (
        <Flex direction="column" gap="3">
          <Text>Register your organization:</Text>
          
<input
  type="text"
  placeholder="Organization name"
  value={name}
  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
  style={{
    padding: "8px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    width: "100%",
  }}
/>
          
          <TextArea 
            placeholder="Description" 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          
          <Button 
            onClick={registerOrganization}
            disabled={!name.trim() || !description.trim() || loading}
          >
            {loading ? (
              <Flex align="center" gap="2">
                <ClipLoader size={16} color="white" />
                <Text>Registering...</Text>
              </Flex>
            ) : "Register Organization"}
          </Button>

          {/* Loading state info */}
          {loading && (
            <Card style={{ backgroundColor: "#f0f8ff", border: "1px solid #add8e6" }}>
              <Text size="1">
                Please check your wallet for transaction approval. 
                This process may take a few moments...
              </Text>
            </Card>
          )}

          {/* Display current values for debugging */}
          <Card style={{ backgroundColor: "#f9f9f9" }}>
            <Text size="1">
              Debug: Name="{name}" | Description="{description}" | 
              Account={account?.address?.slice(0, 6)}...
            </Text>
          </Card>
        </Flex>
      )}
    </Container>
  );
}