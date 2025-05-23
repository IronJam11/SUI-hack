// App.tsx
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { Box, Container, Flex, Heading } from "@radix-ui/themes";
import { ConnectButton } from "@mysten/dapp-kit";
import { OrganisationProfile } from "./createorg";
import { CreateClaim } from "./createclaim";
import { ClaimsList } from "./Claims";

function Navbar() {
  return (
    <Flex
      position="sticky"
      px="4"
      py="2"
      justify="between"
      align="center"
      style={{
        borderBottom: "1px solid var(--gray-a2)",
        backgroundColor: "var(--color-background)",
        zIndex: 1
      }}
    >
      <Box>
        <Heading>Carbon Marketplace</Heading>
      </Box>
      <Flex gap="3" align="center">
        <LinkButton to="/organisation">My Organization</LinkButton>
        <LinkButton to="/create-claim">Create Claim</LinkButton>
        <LinkButton to="/claims">Claims</LinkButton>
        <ConnectButton />
      </Flex>
    </Flex>
  );
}

function LinkButton({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to}>
      <button
        style={{
          padding: "8px 12px",
          borderRadius: "4px",
          background: "var(--gray-3)",
          border: "none",
          cursor: "pointer"
        }}
      >
        {children}
      </button>
    </Link>
  );
}

function LandingPage() {
  return (
    <Container mt="6">
      <Heading size="6">Welcome to Carbon Marketplace</Heading>
      <p>Track and trade carbon credits securely on-chain.</p>
    </Container>
  );
}

export default function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/organisation" element={<OrganisationProfile />} />
        <Route path="/create-claim" element={<CreateClaim />} />
        <Route path="/claims" element={<ClaimsList />} />
      </Routes>
    </Router>
  );
}
