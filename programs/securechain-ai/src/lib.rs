use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Approve, Burn, Mint, MintTo, Token, TokenAccount, Transfer};
use mpl_token_metadata::instructions::{CreateV1, CreateV1InstructionArgs};
use mpl_token_metadata::types::TokenStandard;

//FGMKteZ5U4JuCkiJCb3F2FTEANvy38qWakzLQ8j1FUu
declare_id!("G5dg4TncETCwqXB35XgiyjkP6qdV5SQMPBscbeWkNWQK");

#[program]
pub mod securechain_ai {
    use super::*;

    /// Create Metaplex metadata for the token
    // pub fn create_metadata(
    //     ctx: Context<CreateMetadata>,
    //     name: String,
    //     symbol: String,
    //     uri: String,
    // ) -> Result<()> {
    //     let bump = ctx.accounts.token_data.bump;
    //     let seeds = &[b"token_data".as_ref(), &[bump]];
    //     let signer_seeds = &[&seeds[..]];

    //     msg!("Creating metadata...");
    //     msg!("Name: {}", name);
    //     msg!("Symbol: {}", symbol);
    //     msg!("URI: {}", uri);

    //     // Create metadata using v3 API (compatible with mpl-token-metadata 4.1.2)
    //     let accounts = CreateMetadataAccountV3 {
    //         metadata: ctx.accounts.metadata.key(),
    //         mint: ctx.accounts.mint.key(),
    //         mint_authority: ctx.accounts.token_data.key(), // PDA as mint authority
    //         payer: ctx.accounts.payer.key(),
    //         update_authority: (ctx.accounts.payer.key(), true),
    //         system_program: ctx.accounts.system_program.key(),
    //         rent: Some(ctx.accounts.rent.key()),
    //     };

    //     let data = DataV2 {
    //         name,
    //         symbol,
    //         uri,
    //         seller_fee_basis_points: 0,
    //         creators: None,
    //         collection: None,
    //         uses: None,
    //     };

    //     let args = CreateMetadataAccountV3InstructionArgs {
    //         data,
    //         is_mutable: true,
    //         collection_details: None,
    //     };

    //     let ix = accounts.instruction(args);

    //     anchor_lang::solana_program::program::invoke_signed(
    //         &ix,
    //         &[
    //             ctx.accounts.metadata.to_account_info(),
    //             ctx.accounts.mint.to_account_info(),
    //             ctx.accounts.token_data.to_account_info(),
    //             ctx.accounts.payer.to_account_info(),
    //             ctx.accounts.system_program.to_account_info(),
    //             ctx.accounts.rent.to_account_info(),
    //             ctx.accounts.token_metadata_program.to_account_info(),
    //         ],
    //         signer_seeds,
    //     )?;

    //     msg!("✅ Metadata created successfully!");
    //     Ok(())
    // }


/// Create Metaplex metadata for the token
pub fn create_metadata(
    ctx: Context<CreateMetadata>,
    name: String,
    symbol: String,
    uri: String,
) -> Result<()> {
    let bump = ctx.accounts.token_data.bump;
    let seeds = &[b"token_data".as_ref(), &[bump]];
    let signer_seeds = &[&seeds[..]];

    msg!("Creating metadata...");
    msg!("Name: {}", name);
    msg!("Symbol: {}", symbol);
    msg!("URI: {}", uri);

    let create_args = CreateV1InstructionArgs {
        name,
        symbol,
        uri,
        seller_fee_basis_points: 0,
        creators: None,
        primary_sale_happened: false,
        is_mutable: true,
        token_standard: TokenStandard::Fungible,
        collection: None,
        uses: None,
        collection_details: None,
        rule_set: None,
        decimals: Some(9),
        print_supply: None,
    };

    let create_ix = CreateV1 {
        metadata: ctx.accounts.metadata.key(),
        master_edition: None,
        mint:(ctx.accounts.mint.key(), true),
        authority: ctx.accounts.token_data.key(),
        payer: ctx.accounts.payer.key(),
        update_authority: (ctx.accounts.token_data.key(), true),
        system_program: ctx.accounts.system_program.key(),
        sysvar_instructions: ctx.accounts.rent.key(),
        spl_token_program: anchor_spl::token::ID,
    };

    let create_instruction = create_ix.instruction(create_args);

    anchor_lang::solana_program::program::invoke_signed(
        &create_instruction,
        &[
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.token_data.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
            ctx.accounts.token_metadata_program.to_account_info(),
        ],
        signer_seeds,
    )?;

    msg!("✅ Metadata created successfully!");
    Ok(())
}
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let token_data = &mut ctx.accounts.token_data;
        token_data.authority = ctx.accounts.authority.key();
        token_data.mint = ctx.accounts.mint.key();
        token_data.total_supply = 0;
        token_data.decimals = 9;
        token_data.name = String::from("SecureChain AI");
        token_data.symbol = String::from("SCAI");
        token_data.bump = ctx.bumps.token_data;

        msg!("SecureChain AI Token initialized successfully");
        msg!("Mint: {}", ctx.accounts.mint.key());
        msg!("Authority: {}", ctx.accounts.authority.key());

        Ok(())
    }

    /// Mint the initial supply of 500 million tokens
    /// Only callable once by the authority
    pub fn mint_initial_supply(ctx: Context<MintInitialSupply>) -> Result<()> {
        // Ensure initial supply hasn't been minted yet
        require!(
            ctx.accounts.token_data.total_supply == 0,
            ErrorCode::AlreadyMinted
        );

        let initial_supply: u64 = 500_000_000_000_000_000;
        let bump = ctx.accounts.token_data.bump;
           let seeds = &[
            b"token_data".as_ref(),
            &[bump],
        ];
        let signer = &[&seeds[..]];
        

        // Mint tokens to authority's token account
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.authority_token_account.to_account_info(),
            authority:  ctx.accounts.token_data.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts,signer);

        token::mint_to(cpi_ctx, initial_supply)?;

        // Update total supply
        ctx.accounts.token_data.total_supply = initial_supply;

        msg!("Minted {} tokens to authority", initial_supply);
        msg!(
            "Authority token account: {}",
            ctx.accounts.authority_token_account.key()
        );

        Ok(())
    }

    /// Transfer tokens from sender to recipient
    /// Equivalent to ERC20 transfer()
    pub fn transfer(ctx: Context<TransferTokens>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);

        // Perform the transfer
        let cpi_accounts = Transfer {
            from: ctx.accounts.from_token_account.to_account_info(),
            to: ctx.accounts.to_token_account.to_account_info(),
            authority: ctx.accounts.from_authority.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        token::transfer(cpi_ctx, amount)?;

        msg!(
            "Transferred {} tokens from {} to {}",
            amount,
            ctx.accounts.from_authority.key(),
            ctx.accounts.to_token_account.owner
        );

        Ok(())
    }

    /// Approve a delegate to spend tokens on behalf of the owner
    /// Equivalent to ERC20 approve()
    pub fn approve(ctx: Context<ApproveDelegate>, amount: u64) -> Result<()> {
        let cpi_accounts = Approve {
            to: ctx.accounts.token_account.to_account_info(),
            delegate: ctx.accounts.delegate.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        token::approve(cpi_ctx, amount)?;

        msg!(
            "Approved {} tokens for delegate {}",
            amount,
            ctx.accounts.delegate.key()
        );

        Ok(())
    }

    /// Transfer tokens using a delegated allowance
    /// Equivalent to ERC20 transferFrom()
    pub fn transfer_from(ctx: Context<TransferFrom>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);

        // Verify delegate has allowance
        require!(
            ctx.accounts.from_token_account.delegate.unwrap() == ctx.accounts.delegate.key(),
            ErrorCode::InvalidDelegate
        );

        require!(
            ctx.accounts.from_token_account.delegated_amount >= amount,
            ErrorCode::InsufficientAllowance
        );

        let cpi_accounts = Transfer {
            from: ctx.accounts.from_token_account.to_account_info(),
            to: ctx.accounts.to_token_account.to_account_info(),
            authority: ctx.accounts.delegate.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        token::transfer(cpi_ctx, amount)?;

        msg!(
            "Delegate {} transferred {} tokens",
            ctx.accounts.delegate.key(),
            amount
        );

        Ok(())
    }

    /// Burn tokens and reduce total supply
    /// Equivalent to ERC20 burn()
    pub fn burn(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);

        let token_data = &mut ctx.accounts.token_data;

        // Verify sufficient balance
        require!(
            ctx.accounts.token_account.amount >= amount,
            ErrorCode::InsufficientBalance
        );

        let cpi_accounts = Burn {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        token::burn(cpi_ctx, amount)?;

        // Update total supply
        token_data.total_supply = token_data
            .total_supply
            .checked_sub(amount)
            .ok_or(ErrorCode::Overflow)?;

        msg!(
            "Burned {} tokens. New total supply: {}",
            amount,
            token_data.total_supply
        );

        Ok(())
    }

    /// Revoke delegate approval
    pub fn revoke(ctx: Context<RevokeDelegate>) -> Result<()> {
        let cpi_accounts = token::Revoke {
            source: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        token::revoke(cpi_ctx)?;

        msg!("Revoked delegate approval");

        Ok(())
    }
}

// ========================================
// Context Structs
// ========================================
#[derive(Accounts)]
pub struct CreateMetadata<'info> {
    #[account(
        mut,
        seeds = [b"token_data"],
        bump = token_data.bump,
        has_one = mint
    )]
    pub token_data: Account<'info, TokenData>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    /// CHECK: Metadata account to be created by Metaplex
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,

    /// CHECK: Metaplex Token Metadata Program
    #[account(address = mpl_token_metadata::ID)]
    pub token_metadata_program: UncheckedAccount<'info>,
}
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + TokenData::INIT_SPACE,
        seeds = [b"token_data"],
        bump
    )]
    pub token_data: Account<'info, TokenData>,

    #[account(
        init,
        payer = authority,
        mint::decimals = 9,
        mint::authority =token_data,
    )]
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct MintInitialSupply<'info> {
    #[account(
        mut,
        seeds = [b"token_data"],
        bump = token_data.bump,
        has_one = authority,
        has_one = mint
    )]
    pub token_data: Account<'info, TokenData>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = mint,
        associated_token::authority = authority
    )]
    pub authority_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TransferTokens<'info> {
    #[account(
        mut,
        constraint = from_token_account.owner == from_authority.key() @ ErrorCode::Unauthorized
    )]
    pub from_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub to_token_account: Account<'info, TokenAccount>,

    pub from_authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ApproveDelegate<'info> {
    #[account(
        mut,
        constraint = token_account.owner == owner.key() @ ErrorCode::Unauthorized
    )]
    pub token_account: Account<'info, TokenAccount>,

    /// CHECK: Delegate can be any account
    pub delegate: AccountInfo<'info>,

    pub owner: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct TransferFrom<'info> {
    #[account(mut)]
    pub from_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub to_token_account: Account<'info, TokenAccount>,

    pub delegate: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct BurnTokens<'info> {
    #[account(
        mut,
        seeds = [b"token_data"],
        bump = token_data.bump
    )]
    pub token_data: Account<'info, TokenData>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = token_account.owner == authority.key() @ ErrorCode::Unauthorized
    )]
    pub token_account: Account<'info, TokenAccount>,

    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RevokeDelegate<'info> {
    #[account(
        mut,
        constraint = token_account.owner == owner.key() @ ErrorCode::Unauthorized
    )]
    pub token_account: Account<'info, TokenAccount>,

    pub owner: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

// ========================================
// State Accounts
// ========================================

#[account]
#[derive(InitSpace)]
pub struct TokenData {
    pub authority: Pubkey, // 32 bytes
    pub mint: Pubkey,      // 32 bytes
    pub total_supply: u64, // 8 bytes
    pub decimals: u8,      // 1 byte
    #[max_len(50)]
    pub name: String, // 4 + 50 bytes
    #[max_len(10)]
    pub symbol: String, // 4 + 10 bytes
    pub bump: u8,          // 1 byte
}

// ========================================
// Error Codes
// ========================================

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid amount: must be greater than 0")]
    InvalidAmount,

    #[msg("Arithmetic overflow occurred")]
    Overflow,

    #[msg("Unauthorized: caller is not the owner")]
    Unauthorized,

    #[msg("Insufficient balance")]
    InsufficientBalance,

    #[msg("Initial supply has already been minted")]
    AlreadyMinted,

    #[msg("Invalid delegate")]
    InvalidDelegate,

    #[msg("Insufficient allowance")]
    InsufficientAllowance,
}
