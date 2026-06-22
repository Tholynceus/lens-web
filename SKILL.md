---
name: lens-b20
description: B20 token skill on Base via LENS. Use when an agent wants to create a B20 token (Base's native precompile token standard, Beryl upgrade), validate a config with a live gas + admin-balance check from Base RPC plus a LENS rug-risk read on the config, build a complete ABI-encoded EIP-1559 deployment transaction, read any ERC-20 on Base, check wallet ETH balances, get current gas prices, or verify a tx receipt. No authentication required. Supports Base mainnet and Base Sepolia.
metadata:
  {
    "clawdbot": {
      "emoji": "\u25c9",
      "homepage": "https://lnsx.io/b20"
    }
  }
---

# LENS B20

Deploy B20 tokens on Base — the native precompile token standard launching with Base Beryl. ERC-20 compatible, role-gated, compliance policies built in. No Solidity required.

Built by LENS (lnsx.io), the on-chain rug-risk scanner for Base. Every config you validate or prepare also gets a LENS read, so you can see how the choices you make (admin, freeze, allowlist) would score on a trust scan before you deploy.

All actions use real Base RPC calls. Gas prices, nonces, and balances are fetched live from the chain — nothing is mocked.

**Endpoint:** `https://lens-liard.vercel.app/api/b20-skill`
**Auth:** None required
**Manifest:** `https://lens-liard.vercel.app/api/b20-skill?action=manifest`

> B20 activates on Base mainnet with the Beryl upgrade on 25 Jun 2026, 18:00 UTC. Before that you can prepare and validate, and deploy on Base Sepolia testnet. Sign and broadcast on mainnet once B20 is live.

---

## Actions

| Action | Method | What it does |
|--------|--------|-------------|
| `info` | GET | Live chain status, gas prices, B20 standard overview |
| `gas` | GET | EIP-1559 gas breakdown with deploy cost estimate |
| `balance` | POST | ETH balance + optional ERC-20 balance for any address |
| `token_info` | POST | Read name, symbol, decimals, total supply for any ERC-20 on Base |
| `validate` | POST | B20 config check + live admin balance vs gas + a LENS risk read on the config |
| `prepare` | POST | Complete EIP-1559 deployment tx with live gas + nonce from Base |
| `receipt` | POST | Tx hash status + deployed token address from factory logs |

---

## Usage with Bankr

```bash
# Live Base chain status and gas prices
bankr prompt "Use the LENS B20 skill to get current chain info and gas on Base"

# Check if a wallet can afford to deploy
bankr prompt "Use LENS B20 skill to check the ETH balance of 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

# Read any ERC-20 token on Base
bankr prompt "Use LENS B20 skill to get token info for 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 on Base"

# Validate a B20 config (live balance check + LENS risk read)
bankr prompt "Use LENS B20 skill to validate: name='LENS', symbol='LENS', variant=asset, decimals=18, admin=0x1234..., adminless after setup"

# Prepare a full deployment bundle (real gas + nonce)
bankr prompt "Use LENS B20 skill to prepare a B20 asset token: name='LENS', symbol='LENS', 1B supply cap, admin=0x1234..., no freeze, open transfers"

# Stablecoin with allowlist
bankr prompt "Use LENS B20 skill to prepare a B20 stablecoin: name='exUSD', symbol='EXUSD', supply_cap=100000000, admin=0xABCD..., allowlist policy"

# Check a transaction receipt
bankr prompt "Use LENS B20 skill to check receipt of 0xabc...123 on Base"
```

---

## Reference

### GET `?action=info`

```bash
curl 'https://lens-liard.vercel.app/api/b20-skill?action=info'
```

Returns current block number, base fee, gas tips, the B20 factory address, variant descriptions, and the feature list.

### GET `?action=gas`

```bash
curl 'https://lens-liard.vercel.app/api/b20-skill?action=gas'
```

Returns the EIP-1559 breakdown (base fee, maxFeePerGas, priority tips at 25/50/75th percentile) and the estimated B20 deploy cost in ETH.

### POST `balance`

```bash
curl -X POST https://lens-liard.vercel.app/api/b20-skill \
  -H 'Content-Type: application/json' \
  -d '{ "action": "balance", "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" }'
```

Add `"token": "0x..."` to also check an ERC-20 balance at the same address.

### POST `token_info`

```bash
curl -X POST https://lens-liard.vercel.app/api/b20-skill \
  -H 'Content-Type: application/json' \
  -d '{ "action": "token_info", "address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "holder": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" }'
```

Reads name, symbol, decimals, and total supply via live `eth_call`. Add `"holder"` to also return that address's balance.

### POST `validate`

```bash
curl -X POST https://lens-liard.vercel.app/api/b20-skill \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "validate",
    "name": "LENS",
    "symbol": "LENS",
    "variant": "asset",
    "decimals": 18,
    "admin": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    "policies": { "blocklist": true }
  }'
```

Validates the config, fetches the admin wallet's live ETH balance vs the deploy cost, and returns a `lensCheck` block: a CLEAR / CAUTION verdict on whether the config (admin retained, freeze on, allowlist on) would read as a centralization risk on a LENS scan.

### POST `prepare`

```bash
curl -X POST https://lens-liard.vercel.app/api/b20-skill \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "prepare",
    "name": "LENS",
    "symbol": "LENS",
    "variant": "asset",
    "decimals": 18,
    "supply_cap": "1000000000",
    "admin": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    "policies": {},
    "network": "mainnet"
  }'
```

Returns ABI-encoded calldata for the B20 factory and a complete unsigned EIP-1559 transaction with live gas and nonce. Sign and broadcast once B20 activates.

### POST `receipt`

```bash
curl -X POST https://lens-liard.vercel.app/api/b20-skill \
  -H 'Content-Type: application/json' \
  -d '{ "action": "receipt", "tx_hash": "0xabc123...", "network": "mainnet" }'
```

Returns `success` / `pending` / `failed`, gas used, block number, and the deployed token address parsed from the factory logs.

---

## Token Parameters

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | yes | Max 64 chars |
| `symbol` | string | yes | Max 11 alphanumeric chars |
| `admin` | string | yes | 0x wallet — required unless `adminless: true` |
| `variant` | `asset` \| `stablecoin` | — | Default: `asset` |
| `decimals` | integer 6-18 | — | Default: 18. Fixed at 6 for stablecoin. |
| `supply_cap` | string | — | Integer string. `"0"` = uncapped. |
| `adminless` | boolean | — | No admin. Irreversible — no minting or policy changes ever. |
| `policies.allowlist` | boolean | — | Only allowlisted addresses can hold or receive |
| `policies.blocklist` | boolean | — | Blocked addresses cannot send or receive |
| `policies.freeze` | boolean | — | Admin can freeze any account and seize its balance |
| `contract_uri` | string | — | IPFS URI for token metadata |
| `network` | `mainnet` \| `sepolia` | — | Default: `mainnet` (Base, chainId 8453) |

---

## B20 Variants

**`asset`** — general-purpose. Configurable decimals (6-18), rebasing support, issuer metadata. Good for governance tokens, on-chain-native assets, and real-world assets.

**`stablecoin`** — fiat-focused. Fixed 6 decimals, currency code field. Good for fiat-backed stablecoins and regulated assets.

Both variants are ERC-20 compatible — no changes needed in wallets, DEXes, or indexers.

---

## Compliance Policies

Policies are set at deploy time and encoded as a bitmask in the factory call.

| Policy | Bit | Description |
|--------|-----|-------------|
| `allowlist` | 0 | Only allowlisted addresses can hold or receive the token |
| `blocklist` | 1 | Blocked addresses cannot send or receive |
| `freeze` | 2 | Admin can freeze an account and seize its balance |

`allowlist` and `blocklist` can both be enabled — allowlist takes precedence.

### LENS note on policies

The LENS read in `validate` and `prepare` will flag `freeze` and a retained `admin` as centralization risk signals, because that is how they score on a public trust scan. If you want a token that reads CLEAR, deploy with no freeze, open transfers, and set `adminless: true` (or renounce admin) once setup is done.

---

## Networks

| Network | Chain ID | RPC |
|---------|----------|-----|
| Base (mainnet) | 8453 | https://mainnet.base.org |
| Base Sepolia (testnet) | 84532 | https://sepolia.base.org |

Pass `"network": "sepolia"` to any POST action to target testnet.

---

## Links

- **LENS** — https://lnsx.io
- **Scanner / Markets** — https://lnsx.io/markets
- **API Manifest** — https://lens-liard.vercel.app/api/b20-skill?action=manifest
- **X** — https://x.com/lnsx_io
