import * as anchor from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";
import { expect } from "chai";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { createTestClient, createTestKeypair } from "./helpers";
import { SecureChainClient } from "../scripts/src/client";

const IDL = require("../target/idl/securechain_ai.json");

describe("securechain-ai", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Create client instance
  let client: SecureChainClient;
  let mintKeypair: Keypair;
  let authorityKeypair: Keypair;

  before(async () => {
    // Get authority from provider
    authorityKeypair = (provider.wallet as any).payer;
    client = createTestClient(provider.connection, authorityKeypair);

    //   Generate mint
    mintKeypair = createTestKeypair();
    console.log("\n🔧 Test Setup:");
    console.log("  Authority:", authorityKeypair.publicKey.toString());
    console.log("  Mint:", mintKeypair.publicKey.toString());
    console.log("  Connection:", provider.connection.rpcEndpoint);
    console.log("  ↑ This is the TEMPORARY test validator!\n");
  });

  it("1.Initializes the token", async () => {
    const tx = await client.initialize(authorityKeypair, mintKeypair);

    console.log("✅ Initialize tx:", tx);

    // Verify using client method
    const tokenData = await client.getTokenData();
    expect(tokenData.name).to.equal("SecureChain AI");
    expect(tokenData.symbol).to.equal("SCAI");
    expect(tokenData.decimals).to.equal(9);
    expect(tokenData.totalSupply.toNumber()).to.equal(0);
  });

  it("2.Mints initial supply", async () => {
    const tx = await client.mintInitialSupply(authorityKeypair, mintKeypair.publicKey);

    console.log("✅ Mint tx:", tx);

    const tokenData = await client.getTokenData();
    const expectedSupply = 500_000_000; // 500M tokens

    expect(
      SecureChainClient.fromBaseUnits(tokenData.totalSupply)
    ).to.equal(expectedSupply);

    // Check balance using client
    const balance = await client.getBalance(
      authorityKeypair.publicKey,
      mintKeypair.publicKey
    );
    expect(SecureChainClient.fromBaseUnits(balance)).to.equal(expectedSupply);
    console.log(`  Minted ${expectedSupply.toLocaleString()} SCAI`);
  });

  it("3.Transfers tokens", async () => {
    const recipient = Keypair.generate();
    const transferAmount = 10_000;

    // Create token account
    const recipientTokenAccount = await client.createTokenAccountIfNeeded(
      authorityKeypair,
      recipient.publicKey,
      mintKeypair.publicKey
    );

    // Transfer using client
    await client.transfer(
      authorityKeypair,
      recipientTokenAccount,
      SecureChainClient.toBaseUnits(transferAmount),
      mintKeypair.publicKey
    );

    // Verify balance
    const balance = await client.getBalance(recipient.publicKey, mintKeypair.publicKey);
    expect(SecureChainClient.fromBaseUnits(balance)).to.equal(transferAmount);
  });

  it("4.Approves and transfers from delegate", async () => {
    const delegate = Keypair.generate();
    const recipient = Keypair.generate();
    const approveAmount = 5_000;
    const transferAmount = 2_000;

    // Airdrop to delegate for transaction fees
    const airdropSig = await provider.connection.requestAirdrop(
      delegate.publicKey,
      1e9
    );

    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      signature: airdropSig,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });

    // Create recipient token account
    const recipientTokenAccount = await client.createTokenAccountIfNeeded(
      authorityKeypair,
      recipient.publicKey,
      mintKeypair.publicKey
    );

    // Approve using client
    await client.approve(
      authorityKeypair,
      delegate.publicKey,
      SecureChainClient.toBaseUnits(approveAmount),
      mintKeypair.publicKey
    );

    // Transfer from using client
    const authorityTokenAccount = await client.createTokenAccountIfNeeded(
      authorityKeypair,
      authorityKeypair.publicKey,
      mintKeypair.publicKey
    );

    // Create delegate wallet and client
    const delegateWallet = new NodeWallet(delegate);
    const delegateClient = new SecureChainClient(
      provider.connection,
      delegateWallet,
      IDL
    );

    await delegateClient.transferFrom(
      delegate,
      authorityTokenAccount,
      recipientTokenAccount,
      SecureChainClient.toBaseUnits(transferAmount)
    );

    // Verify recipient balance
    const balance = await client.getBalance(recipient.publicKey, mintKeypair.publicKey);
    expect(SecureChainClient.fromBaseUnits(balance)).to.equal(transferAmount);

    // Revoke approval
    await client.revoke(authorityKeypair, mintKeypair.publicKey);
  });

  it("Burns tokens", async () => {
    const burnAmount = 100_000;

    // Get balance before
    const balanceBefore = await client.getBalance(
      authorityKeypair.publicKey,
      mintKeypair.publicKey
    );

    // Burn using client
    await client.burn(
      authorityKeypair,
      SecureChainClient.toBaseUnits(burnAmount),
      mintKeypair.publicKey
    );

    // Verify balance decreased
    const balanceAfter = await client.getBalance(
      authorityKeypair.publicKey,
      mintKeypair.publicKey
    );

    expect(SecureChainClient.fromBaseUnits(balanceAfter)).to.equal(
      SecureChainClient.fromBaseUnits(balanceBefore) - burnAmount
    );

    // Verify total supply decreased
    const tokenData = await client.getTokenData();
    const expectedSupply = 500_000_000 - burnAmount;

    expect(SecureChainClient.fromBaseUnits(tokenData.totalSupply)).to.equal(
      expectedSupply
    );
  });
});