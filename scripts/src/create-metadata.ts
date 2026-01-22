import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createMetadataAccountV3 } from '@metaplex-foundation/mpl-token-metadata';
// import { createCreateMetadataAccountV3Instruction } from '@metaplex-foundation/mpl-token-metadata';
import { 
  createSignerFromKeypair, 
  signerIdentity, 
  publicKey 
} from '@metaplex-foundation/umi';
import { sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import NodeWallet  from '@coral-xyz/anchor/dist/cjs/provider';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';

async function createTokenMetadata() {
  try {
    console.log(' Starting Metaplex metadata creation...\n');

    // Step 1: Read token-info.json
    const tokenInfoPath = path.join(process.cwd(), 'token-info.json');
    if (!fs.existsSync(tokenInfoPath)) {
      throw new Error(' token-info.json not found! Run the initialization script first.');
    }

    const tokenInfo = JSON.parse(fs.readFileSync(tokenInfoPath, 'utf-8'));
    const mint = new PublicKey(tokenInfo.mintAddress);
    
    
    console.log(' Token Information:');
    console.log(`   Name: ${tokenInfo.name}`);
    console.log(`   Symbol: ${tokenInfo.symbol}`);
    console.log(`   Mint: ${tokenInfo.mintAddress}`);
    console.log(`   Authority: ${tokenInfo.authority}\n`);

   const PROGRAM_ID = new PublicKey(tokenInfo.programId);

// Derive token_data PDA (only uses "token_data" seed, NOT the mint)
const [tokenDataPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from('token_data')],  // Only this seed!
  PROGRAM_ID
);
console.log("PDA",tokenDataPDA);

    // Step 2: Check if metadata URI exists
    if (!tokenInfo.metadataUri) {
      console.log('  WARNING: metadataUri not found in token-info.json!');
      console.log('Please add your Pinata metadata URI manually:\n');
      console.log('Example:');
      console.log('{');
      console.log('  ...');
      console.log('  "metadataUri": "https://gateway.pinata.cloud/ipfs/YOUR_CID",');
      console.log('  "logoUri": "https://gateway.pinata.cloud/ipfs/YOUR_LOGO_CID"');
      console.log('}\n');
      
      // Prompt user to enter metadata URI
      console.log('For now, please enter your metadata URI:');
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const metadataUri = await new Promise<string>((resolve) => {
        readline.question('Metadata URI: ', (answer: string) => {
          readline.close();
          resolve(answer.trim());
        });
      });
      
      if (!metadataUri) {
        throw new Error('Metadata URI is required!');
      }
      
      tokenInfo.metadataUri = metadataUri;
      fs.writeFileSync(tokenInfoPath, JSON.stringify(tokenInfo, null, 2));
      console.log(' Metadata URI saved to token-info.json\n');
    }

    console.log(` Metadata URI: ${tokenInfo.metadataUri}\n`);

    // Step 3: Initialize UMI (Metaplex SDK)
    console.log(' Initializing Metaplex UMI...');
    const umi = createUmi('https://api.devnet.solana.com');

    // Step 4: Load authority keypair
    console.log(' Loading authority keypair...');
    const keypairPath = path.join(os.homedir(), '.config', 'solana', 'id.json');
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
    const authorityKeypair = Keypair.fromSecretKey(new Uint8Array(keypairData));

    // Convert to UMI keypair format
    const umiKeypair = umi.eddsa.createKeypairFromSecretKey(authorityKeypair.secretKey);
    const signer = createSignerFromKeypair(umi, umiKeypair);
    umi.use(signerIdentity(signer));

    console.log(' Authority loaded:', signer.publicKey);
    
    // Verify authority matches
    if (signer.publicKey !== tokenInfo.authority) {
      console.log('\n  WARNING: Loaded keypair does not match token authority!');
      console.log(`   Expected: ${tokenInfo.authority}`);
      console.log(`   Loaded:   ${signer.publicKey}`);
      console.log('\nThis might cause the transaction to fail!\n');
    }

    // Step 5: Create metadata account
    console.log('\n Creating Metaplex metadata account on-chain...\n');
    console.log('This will:');
    console.log('  1. Create a metadata account linked to your mint');
    console.log('  2. Store name, symbol, and URI on-chain');
    console.log('  3. Make your token visible in wallets\n');


    const tx = await createMetadataAccountV3(umi, {
      mint:mint,
      mintAuthority:tokenDataPDA,
      payer: signer,
      updateAuthority: signer.publicKey,
      data: {
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        uri: tokenInfo.metadataUri,
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null,
      },
      isMutable: true,
      collectionDetails: null,
    }as any).sendAndConfirm(umi);

    console.log('Metadata account created successfully!\n');
    console.log(' Transaction Signature:');
    console.log(`   ${tx.signature}`);
    console.log(`\n🔍 View on Explorer:`);
    console.log(`   https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`);
    console.log(`   https://explorer.solana.com/address/${tokenInfo.mintAddress}?cluster=devnet\n`);

    console.log('==========================================');
    console.log(' TOKEN METADATA CREATED ON-CHAIN!');
    console.log('==========================================');
    console.log('Your token now has Metaplex metadata!');
    console.log('Wallets will now display:');
    console.log(`   Name: ${tokenInfo.name}`);
    console.log(`   Symbol: ${tokenInfo.symbol}`);
    console.log(`   Logo: ${tokenInfo.logoUri || '(from metadata.json)'}`);
    console.log('==========================================\n');

    // Step 6: Update token-info.json
    tokenInfo.metadataCreated = true;
    tokenInfo.metadataSignature = tx.signature;
    tokenInfo.metadataCreatedAt = new Date().toISOString();
    fs.writeFileSync(tokenInfoPath, JSON.stringify(tokenInfo, null, 2));
    console.log(' Updated token-info.json with metadata creation info\n');

    console.log(' Next Steps:');
    console.log('  1. Wait 1-2 minutes for blockchain confirmation');
    console.log('  2. Import token in Phantom wallet using mint address');
    console.log('  3. Your token should show with name, symbol, and logo!\n');

  } catch (error: any) {
    console.error('\n Error creating metadata:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('\n  Metadata account already exists for this mint!');
      console.log('Your token already has on-chain metadata. Nothing to do! \n');
    } else if (error.message.includes('Attempt to debit')) {
      console.log('\n  Insufficient SOL balance!');
      console.log('Get devnet SOL: solana airdrop 1\n');
    } else {
      console.error('\n Full error:', error);
    }
    
    process.exit(1);
  }
}

createTokenMetadata()
  .then(() => {
    console.log('Metadata creation script completed!');
    process.exit(0);
  })
  .catch((err) => {
    console.error(' Fatal error:', err);
    process.exit(1);
  });
