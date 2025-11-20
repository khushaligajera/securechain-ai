import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { SecureChainClient } from "../scripts/src/client";

const IDL = require("../target/idl/securechain_ai.json");

/**
 * Create a SecureChainClient for TESTING
 * Uses the test validator connection from Anchor
 */
export function createTestClient(
  connection: Connection,
  keypair: Keypair
): SecureChainClient {
  const wallet = new NodeWallet(keypair);
  return new SecureChainClient(connection, wallet, IDL);
}

/**
 * Create a test keypair
 */
export function createTestKeypair(): Keypair {
  return Keypair.generate();
}
