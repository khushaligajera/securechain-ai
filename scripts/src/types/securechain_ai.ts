/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/securechain_ai.json`.
 */
export type SecurechainAi = {
  "address": "5Hm6eDkovqPoLwMwxf8nyveeJJDdhBkTmxEodLZU5RFF",
  "metadata": {
    "name": "securechainAi",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "approve",
      "docs": [
        "Approve a delegate to spend tokens on behalf of the owner",
        "Equivalent to ERC20 approve()"
      ],
      "discriminator": [
        69,
        74,
        217,
        36,
        115,
        117,
        97,
        76
      ],
      "accounts": [
        {
          "name": "tokenAccount",
          "writable": true
        },
        {
          "name": "delegate"
        },
        {
          "name": "owner",
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "burn",
      "docs": [
        "Burn tokens and reduce total supply",
        "Equivalent to ERC20 burn()"
      ],
      "discriminator": [
        116,
        110,
        29,
        56,
        107,
        219,
        42,
        93
      ],
      "accounts": [
        {
          "name": "tokenData",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  100,
                  97,
                  116,
                  97
                ]
              }
            ]
          }
        },
        {
          "name": "mint",
          "writable": true
        },
        {
          "name": "tokenAccount",
          "writable": true
        },
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "tokenData",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  100,
                  97,
                  116,
                  97
                ]
              }
            ]
          }
        },
        {
          "name": "mint",
          "writable": true,
          "signer": true
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "mintInitialSupply",
      "docs": [
        "Mint the initial supply of 500 million tokens",
        "Only callable once by the authority"
      ],
      "discriminator": [
        85,
        148,
        217,
        233,
        3,
        156,
        195,
        99
      ],
      "accounts": [
        {
          "name": "tokenData",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  100,
                  97,
                  116,
                  97
                ]
              }
            ]
          }
        },
        {
          "name": "mint",
          "writable": true,
          "relations": [
            "tokenData"
          ]
        },
        {
          "name": "authorityTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "tokenData"
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "revoke",
      "docs": [
        "Revoke delegate approval"
      ],
      "discriminator": [
        170,
        23,
        31,
        34,
        133,
        173,
        93,
        242
      ],
      "accounts": [
        {
          "name": "tokenAccount",
          "writable": true
        },
        {
          "name": "owner",
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "transfer",
      "docs": [
        "Transfer tokens from sender to recipient",
        "Equivalent to ERC20 transfer()"
      ],
      "discriminator": [
        163,
        52,
        200,
        231,
        140,
        3,
        69,
        186
      ],
      "accounts": [
        {
          "name": "fromTokenAccount",
          "writable": true
        },
        {
          "name": "toTokenAccount",
          "writable": true
        },
        {
          "name": "fromAuthority",
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "transferFrom",
      "docs": [
        "Transfer tokens using a delegated allowance",
        "Equivalent to ERC20 transferFrom()"
      ],
      "discriminator": [
        230,
        255,
        130,
        7,
        220,
        247,
        122,
        0
      ],
      "accounts": [
        {
          "name": "fromTokenAccount",
          "writable": true
        },
        {
          "name": "toTokenAccount",
          "writable": true
        },
        {
          "name": "delegate",
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "tokenData",
      "discriminator": [
        10,
        136,
        199,
        13,
        59,
        103,
        129,
        70
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidAmount",
      "msg": "Invalid amount: must be greater than 0"
    },
    {
      "code": 6001,
      "name": "overflow",
      "msg": "Arithmetic overflow occurred"
    },
    {
      "code": 6002,
      "name": "unauthorized",
      "msg": "Unauthorized: caller is not the owner"
    },
    {
      "code": 6003,
      "name": "insufficientBalance",
      "msg": "Insufficient balance"
    },
    {
      "code": 6004,
      "name": "alreadyMinted",
      "msg": "Initial supply has already been minted"
    },
    {
      "code": 6005,
      "name": "invalidDelegate",
      "msg": "Invalid delegate"
    },
    {
      "code": 6006,
      "name": "insufficientAllowance",
      "msg": "Insufficient allowance"
    }
  ],
  "types": [
    {
      "name": "tokenData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "totalSupply",
            "type": "u64"
          },
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "symbol",
            "type": "string"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
