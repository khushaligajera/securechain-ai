import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Keypair,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { Program, AnchorProvider, BN, Idl } from '@coral-xyz/anchor';
import { Wallet } from '@coral-xyz/anchor/dist/cjs/provider';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
import { SecurechainAi } from './types/securechain_ai';
import * as fs from "fs";
import os from "os";
import path from "path";

// Program ID from your declare_id!
const PROGRAM_ID = new PublicKey('3MByoH5v5Mbu3VjL82JMiQQheuFqSEgZ9Ke2ZWvuiiM9');

// Token Data PDA seeds
const TOKEN_DATA_SEED = Buffer.from('token_data');

const IDL = require('../../target/idl/securechain_ai.json');

/**
 * SecureChain AI Token Client
 * Provides methods to interact with the SecureChain AI Solana program
 */
export class SecureChainClient {
  private program: Program<SecurechainAi>;
  private connection: Connection;
  private provider: AnchorProvider;

  constructor(
    connection: Connection,
    wallet: Wallet,
    idl: Idl
  ) {
    this.connection = connection;
    this.provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });
    this.program = new Program<SecurechainAi>(idl as SecurechainAi, this.provider);
  }

  /**
   * Derive the Token Data PDA
   */
  getTokenDataPDA(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [TOKEN_DATA_SEED],
      PROGRAM_ID
    );
  }

 /**
 * Create Metaplex metadata using the on-chain program
 * @param payer - Payer keypair (pays for metadata account)
 * @param mint - The mint public key
 * @param name - Token name
 * @param symbol - Token symbol
 * @param uri - Metadata URI (IPFS URL)
 * @returns Transaction signature
 */
async createMetadata(
  payer: Keypair,
  mint: PublicKey,
  name: string,
  symbol: string,
  uri: string
): Promise<string> {
  const [tokenDataPDA] = this.getTokenDataPDA();

  // Metaplex Token Metadata Program ID
  const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

  // Derive metadata PDA
  const [metadataPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  );

  console.log('📝 Creating metadata...');
  console.log('   Metadata PDA:', metadataPDA.toString());
  console.log('   Token Data PDA:', tokenDataPDA.toString());
  console.log('   Mint:', mint.toString(), '\n');

  const tx = await this.program.methods
    .createMetadata(name, symbol, uri)
    .accounts({
      tokenData: tokenDataPDA,
      mint: mint,
      metadata: metadataPDA,
      payer: payer.publicKey,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,  // ✅ Changed from sysvarInstructions to rent
      tokenMetadataProgram: METADATA_PROGRAM_ID,  // ✅ Good to add this too
    } as any)
    .rpc();

  console.log('✅ Metadata created successfully!');
  console.log('📝 Transaction signature:', tx);
  console.log(`🔍 Explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet\n`);

  return tx;
}
  /**
   * Initialize the SecureChain AI token
   * @param authority - The authority keypair
   * @param mint - The mint keypair (new keypair)
   * @returns Transaction signature
   */
  async initialize(
    authority: Keypair,
    mint: Keypair
  ) {
    try {
      const [tokenDataPDA] = this.getTokenDataPDA();

      const tx = await this.program.methods
        .initialize()
        .accounts({
          tokenData: tokenDataPDA,
          mint: mint.publicKey,
          authority: authority.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        } as any)
        .signers([mint])
        .rpc();
      console.log("📝 Program ID:", this.program.programId.toString());
      console.log('🔗Initialize transaction signature:', tx);
      console.log("🔍 Explorer:", `https://explorer.solana.com/tx/${tx}?cluster=devnet\n`);
      console.log("⏳ Waiting for data to be available...");
      await new Promise(resolve => setTimeout(resolve, 5000));
      const tokenData = await this.program.account.tokenData.fetch(tokenDataPDA);
      console.log("\n🎉 TOKEN CREATED SUCCESSFULLY!\n");
      console.log("==========================================");
      console.log("📦 Mint Address:", tokenData.mint.toString());
      console.log("👤 Authority:", tokenData.authority.toString());
      console.log("📛 Name:", tokenData.name);
      console.log("🏷️  Symbol:", tokenData.symbol);
      console.log("🔢 Decimals:", tokenData.decimals);
      console.log("💎 Total Supply:", tokenData.totalSupply.toString());
      console.log("==========================================\n");

      // Save to file for next steps
      const info = {
        programId: this.program.programId.toString(),
        mintAddress: tokenData.mint.toString(),
        authority: tokenData.authority.toString(),
        tokenDataPDA: tokenDataPDA.toString(),
        name: tokenData.name,
        symbol: tokenData.symbol,
        decimals: tokenData.decimals,
        network: "devnet"
      };

      fs.writeFileSync(
        "token-info.json",
        JSON.stringify(info, null, 2)
      );
      console.log("💾 Token info saved to token-info.json");
      console.log("\n⚠️  IMPORTANT: Save the Mint Address above! You'll need it for metadata.\n");

    } catch (error: any) {
      console.error("\n❌ Error:", error.message);
      if (error.logs) {
        console.log("\n📋 Transaction logs:");
        error.logs.forEach((log: string) => console.log(log));
      }
    }

  }

  /**
   * Mint the initial supply of 500 million tokens
   * @param authority - The authority keypair
   * @param mint - The mint public key
   * @returns Transaction signature
   */
  async mintInitialSupply(
    authority: Keypair,
    mint: PublicKey
  ): Promise<string> {
    const [tokenDataPDA] = this.getTokenDataPDA();

    const authorityTokenAccount = await getAssociatedTokenAddress(
      mint,
      authority.publicKey
    );

    const tx = await this.program.methods
      .mintInitialSupply()
      .accounts({
        tokenData: tokenDataPDA,
        mint: mint,
        authorityTokenAccount: authorityTokenAccount,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('Mint initial supply transaction signature:', tx);
    console.log("🔍 Explorer:", `https://explorer.solana.com/tx/${tx}?cluster=devnet\n`);
    console.log("⏳ Waiting for data to be available...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    const tokenData = await this.program.account.tokenData.fetch(tokenDataPDA);
    console.log("\n🎉 INTIAL SUPPLY!\n");
    console.log("==========================================");
    console.log("💎 Total Supply:", tokenData.totalSupply.toString());
    console.log("==========================================\n");
    return tx;
  }

  /**
   * Transfer tokens from sender to recipient
   * @param from - Sender's keypair
   * @param toTokenAccount - Recipient's token account address
   * @param amount - Amount to transfer (in base units)
   * @param mint - The mint public key
   * @returns Transaction signature
   */
  async transfer(
    from: Keypair,
    toTokenAccount: PublicKey,
    amount: BN,
    mint: PublicKey
  ): Promise<string> {
    const fromTokenAccount = await getAssociatedTokenAddress(
      mint,
      from.publicKey
    );

    const tx = await this.program.methods
      .transfer(amount)
      .accounts({
        fromTokenAccount: fromTokenAccount,
        toTokenAccount: toTokenAccount,
        fromAuthority: from.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      } as any)
      .rpc();

    console.log('Transfer transaction signature:', tx);
    return tx;
  }

  /**
   * Approve a delegate to spend tokens
   * @param owner - Token owner's keypair
   * @param delegate - Delegate's public key
   * @param amount - Amount to approve
   * @param mint - The mint public key
   * @returns Transaction signature
   */
  async approve(
    owner: Keypair,
    delegate: PublicKey,
    amount: BN,
    mint: PublicKey
  ): Promise<string> {
    const tokenAccount = await getAssociatedTokenAddress(
      mint,
      owner.publicKey
    );

    const tx = await this.program.methods
      .approve(amount)
      .accounts({
        tokenAccount: tokenAccount,
        delegate: delegate,
        owner: owner.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      } as any)
      .rpc();

    console.log('Approve transaction signature:', tx);
    return tx;
  }

  /**
   * Transfer tokens using delegated allowance
   * @param delegate - Delegate's keypair
   * @param fromTokenAccount - Source token account
   * @param toTokenAccount - Destination token account
   * @param amount - Amount to transfer
   * @returns Transaction signature
   */
  async transferFrom(
    delegate: Keypair,
    fromTokenAccount: PublicKey,
    toTokenAccount: PublicKey,
    amount: BN
  ): Promise<string> {
    const tx = await this.program.methods
      .transferFrom(amount)
      .accounts({
        fromTokenAccount: fromTokenAccount,
        toTokenAccount: toTokenAccount,
        delegate: delegate.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      } as any)
      .rpc();

    console.log('TransferFrom transaction signature:', tx);
    return tx;
  }

  /**
   * Burn tokens and reduce total supply
   * @param authority - Token holder's keypair
   * @param amount - Amount to burn
   * @param mint - The mint public key
   * @returns Transaction signature
   */
  async burn(
    authority: Keypair,
    amount: BN,
    mint: PublicKey
  ): Promise<string> {
    const [tokenDataPDA] = this.getTokenDataPDA();

    const tokenAccount = await getAssociatedTokenAddress(
      mint,
      authority.publicKey
    );

    const tx = await this.program.methods
      .burn(amount)
      .accounts({
        tokenData: tokenDataPDA,
        mint: mint,
        tokenAccount: tokenAccount,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      } as any)
      .rpc();

    console.log('Burn transaction signature:', tx);
    return tx;
  }

  /**
   * Revoke delegate approval
   * @param owner - Token owner's keypair
   * @param mint - The mint public key
   * @returns Transaction signature
   */
  async revoke(
    owner: Keypair,
    mint: PublicKey
  ): Promise<string> {
    const tokenAccount = await getAssociatedTokenAddress(
      mint,
      owner.publicKey
    );

    const tx = await this.program.methods
      .revoke()
      .accounts({
        tokenAccount: tokenAccount,
        owner: owner.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      } as any)
      .rpc();

    console.log('Revoke transaction signature:', tx);
    return tx;
  }

  /**
   * Get token data account information
   * @returns Token data account
   */
  async getTokenData() {
    const [tokenDataPDA] = this.getTokenDataPDA();
    return await this.program.account.tokenData.fetch(tokenDataPDA);
  }

  /**
   * Get token balance for an account
   * @param owner - Owner's public key
   * @param mint - The mint public key
   * @returns Token balance
   */
  async getBalance(owner: PublicKey, mint: PublicKey): Promise<bigint> {
    const tokenAccount = await getAssociatedTokenAddress(mint, owner);
    const accountInfo = await this.connection.getTokenAccountBalance(tokenAccount);
    return BigInt(accountInfo.value.amount);
  }

  /**
   * Create associated token account if it doesn't exist
   * @param payer - Payer keypair
   * @param owner - Token account owner
   * @param mint - The mint public key
   * @returns Token account address
   */
  async createTokenAccountIfNeeded(
    payer: Keypair,
    owner: PublicKey,
    mint: PublicKey
  ): Promise<PublicKey> {
    const tokenAccount = await getAssociatedTokenAddress(mint, owner);

    const accountInfo = await this.connection.getAccountInfo(tokenAccount);

    if (!accountInfo) {
      const transaction = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          payer.publicKey,
          tokenAccount,
          owner,
          mint
        )
      );

      await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [payer]
      );

      console.log('Created token account:', tokenAccount.toBase58());
    }

    return tokenAccount;
  }

  


  /**
   * Convert human-readable amount to base units
   * @param amount - Amount in tokens (e.g., 100.5)
   * @param decimals - Token decimals (default: 9)
   * @returns Amount in base units
   */
  static toBaseUnits(amount: number, decimals: number = 9): BN {
    return new BN(amount * Math.pow(10, decimals));
  }

  /**
   * Convert base units to human-readable amount
   * @param amount - Amount in base units
   * @param decimals - Token decimals (default: 9)
   * @returns Amount in tokens
   */
  static fromBaseUnits(amount: BN | bigint, decimals: number = 9): number {
    const amountBN = typeof amount === 'bigint' ? amount : BigInt(amount.toString());
    return Number(amountBN) / Math.pow(10, decimals);
  }
}

async function requestAirdrop(connection: Connection, publicKey: PublicKey, amount: number): Promise<void> {
  console.log(`💰 Requesting ${amount} SOL airdrop...`);
  
  try {
    const signature = await connection.requestAirdrop(publicKey, amount * 1e9);
    console.log(`📝 Airdrop signature: ${signature}`);
    
    // Wait for confirmation
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      ...latestBlockhash
    });
    
    console.log('✅ Airdrop confirmed!\n');
  } catch (error: any) {
    console.log("failed airdrop");
  }
}

export async function exampleUsage() {
  // Setup
  const idlJson = require('../../target/idl/securechain_ai.json');
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
 const keypairPath = path.join(os.homedir(), ".config", "solana", "id.json");
const secret = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
const authorityKeypair = Keypair.fromSecretKey(Uint8Array.from(secret));
 
  // Use NodeWallet - handles transaction signing automatically
  const wallet = new NodeWallet(authorityKeypair);

  const client = new SecureChainClient(connection, wallet, idlJson as Idl);

  console.log("👛 Wallet:", wallet.publicKey.toString());
  let balance = await connection.getBalance(wallet.publicKey);
  console.log("💰 Balance:", balance, "SOL\n");
  if (balance < 1e9) { // Less than 1 SOL
    await requestAirdrop(connection, wallet.publicKey, 1);
    balance = await connection.getBalance(wallet.publicKey);
    console.log("💰 New Balance:", balance / 1e9, "SOL\n");
  } else {
    console.log("✅ Sufficient balance\n");
  }

  // ✅ ADD THIS CHECK
  let tokenData;
  let mintPublicKey;
  let tokenDataPDA;
  
  try {
    console.log("🔍 Checking if token already exists...\n");
    tokenData = await client.getTokenData();
    tokenDataPDA=await client.getTokenDataPDA();
    mintPublicKey = tokenData.mint;
    
    console.log("✅ Token already exists!");
    console.log("==========================================");
    console.log("📦 Mint Address:", tokenData.mint.toString());
    console.log("👤 Authority:", tokenData.authority.toString());
    console.log("📛 Name:", tokenData.name);
    console.log("🏷️  Symbol:", tokenData.symbol);
    console.log("🔢 Decimals:", tokenData.decimals);
    console.log("PDA: ", tokenDataPDA.toString());
    
    console.log("💎 Total Supply:", tokenData.totalSupply.toString());
    console.log("==========================================\n");
    
    // Save to file
    const info = {
      programId: client['program'].programId.toString(),
      mintAddress: tokenData.mint.toString(),
      authority: tokenData.authority.toString(),
      name: tokenData.name,
      symbol: tokenData.symbol,
      decimals: tokenData.decimals,
      totalSupply: tokenData.totalSupply.toString(),
      tokenDataPDA:tokenDataPDA.toString(),
      network: "devnet"
    };
    
    fs.writeFileSync("token-info.json", JSON.stringify(info, null, 2));
    console.log("💾 Token info saved to token-info.json\n");
    
  } catch (error) {
    console.log("ℹ️  Token doesn't exist yet. Initializing new token...\n");
    
    // Initialize new token
   let mintKeypair: Keypair;

if (fs.existsSync("mint.json")) {
  const secret = JSON.parse(fs.readFileSync("mint.json", "utf-8"));
  mintKeypair = Keypair.fromSecretKey(Uint8Array.from(secret));
  console.log("ALREADY EXIST");
  
} else {
  mintKeypair = Keypair.generate();
  fs.writeFileSync("mint.json", JSON.stringify(Array.from(mintKeypair.secretKey)));
}
    await client.initialize(authorityKeypair, mintKeypair);
    console.log("✅ Token initialized!");
    
    mintPublicKey = mintKeypair.publicKey;
    tokenData = await client.getTokenData();
  }
  
  // Check if initial supply has been minted
  if (tokenData.totalSupply.toString() === "0") {
    console.log("\n⏳ Minting initial supply...\n");
    await client.mintInitialSupply(authorityKeypair, mintPublicKey);
    console.log("✅ Initial supply minted!");
  } else {
    console.log("ℹ️  Initial supply already minted. Skipping...\n");
  }
  console.log("🎨 Checking if metadata exists...\n");
  
  const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
  const [metadataPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      METADATA_PROGRAM_ID.toBuffer(),
      mintPublicKey.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  );

  const metadataAccount = await connection.getAccountInfo(metadataPDA);
  
  if (!metadataAccount) {
    console.log("ℹ️  Metadata doesn't exist. Creating...\n")

    // Read metadata URIs from token-info.json or prompt user
    const tokenInfo = JSON.parse(fs.readFileSync("token-info.json", "utf-8"));
    
    let metadataUri = tokenInfo.metadataUri;
    if (!metadataUri) {
      console.log("⚠️  metadataUri not found in token-info.json!");
      console.log("Please add your Pinata metadata URI to token-info.json:");
      console.log('  "metadataUri": "https://gateway.pinata.cloud/ipfs/YOUR_CID"\n');
      
      // For now, use a placeholder or exit
      throw new Error("Please add metadataUri to token-info.json and run again");
    }
    
    await client.createMetadata(
      authorityKeypair,
      mintPublicKey,
      tokenInfo.name,
      tokenInfo.symbol,
      metadataUri
    );
    
    // Update token-info.json
    tokenInfo.metadataCreated = true;
    tokenInfo.metadataAccount = metadataPDA.toString();
    fs.writeFileSync("token-info.json", JSON.stringify(tokenInfo, null, 2));
    console.log("💾 Updated token-info.json with metadata info\n");
    
    console.log("🎉 Metadata created successfully!");
  } else {
    console.log("✅ Metadata already exists!");
    console.log("   Metadata Account:", metadataPDA.toString(), "\n");
  }


  // Final token data
  const finalTokenData = await client.getTokenData();
  console.log("\n📊 Final Token Data:");
  console.log("==========================================");
  console.log("💎 Total Supply:", finalTokenData.totalSupply.toString());
  console.log("==========================================\n");
  
  console.log("🔍 View on Explorer:");
  console.log(`   https://explorer.solana.com/address/${mintPublicKey.toString()}?cluster=devnet\n`);

 //console.log('Balance:', SecureChainClient.fromBaseUnits(balance));
}

exampleUsage()
  .then(() => {
    console.log("✅ Script completed!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Fatal error:", err);
    process.exit(1);
  });
  //token mint :DUjPaV7brhNzArtgTiAKfxhw7Z5e9fwpo8JzuBxtHPxt
  //  "logoUri": "https://gateway.pinata.cloud/ipfs/bafybeibxkanvk3ucz2endgugz6ay2574nprjxartnkmgnohv5p4m5zabnq",
  // "metadataUri": "https://gateway.pinata.cloud/ipfs/bafkreiambwpfdpcig5yg3izlrbgf7rfmbwnesn5ipsjl5x72owjhghecqu"