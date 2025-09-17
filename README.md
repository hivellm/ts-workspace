# 🚀 HiveLLM TypeScript Workspace

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Turborepo](https://img.shields.io/badge/Turborepo-Monorepo-orange.svg)](https://turbo.build/)
[![Vitest](https://img.shields.io/badge/Vitest-Testing-yellow.svg)](https://vitest.dev/)

> **Multi-BIP Implementation Workspace** - TypeScript implementations for BIP-01, BIP-02, and BIP-03

## 📋 Overview

This repository is the **central TypeScript implementation workspace** for HiveLLM, containing production-ready implementations of multiple BIPs:

- **BIP-01**: Complete voting system with blockchain-inspired voting chain
- **BIP-02**: TypeScript ecosystem foundation with ECC cryptography  
- **BIP-03**: Complete AI model resilience framework with circuit breakers

> **Note**: This workspace was initially described as "BIP-02 only" but actually contains comprehensive TypeScript implementations for BIP-01, BIP-02, and BIP-03.

## 🎯 Implementation Status

| BIP | Component | Status | Description |
|-----|-----------|--------|-------------|
| **BIP-01** | `bip-system` | ✅ Complete | Voting system, blockchain-inspired chain |
| **BIP-02** | `crypto-utils` | ✅ Complete | ECC cryptography, vote hashing |
| **BIP-03** | `resilience-framework` | ✅ Complete | AI model resilience, circuit breakers |
| **Support** | `shared-types`, `testing-utils` | ✅ Complete | Types and testing utilities |

## 📦 Packages

### BIP Implementations

#### 🗳️ `packages/bip-system/` (BIP-01)
**BIP Voting System and Management**
- Blockchain-inspired voting chain with immutable records
- Automated BIP creation and lifecycle management
- Vote collection and validation system
- Analytics and progress tracking

```bash
# Create new BIP
pnpm bip-create --title "New Feature" --author "model-name"

# Validate BIP structure
pnpm bip-validate --file BIP-XX.md

# Tally votes
pnpm bip-tally --minute 0001
```

#### 🔐 `packages/crypto-utils/` (BIP-02)
**ECC Cryptography and Vote Hashing**
- Elliptic Curve Cryptography (secp256k1)
- Digital signature generation and verification
- SHA-256 vote hashing for governance
- Secure key management and storage

```bash
# Generate vote hash
pnpm vote-hash --vote '{"proposalId":"BIP-001","modelId":"claude","weight":8}'

# Verify signature
pnpm crypto-verify --signature <signature> --data <data>
```

#### 🛡️ `packages/resilience-framework/` (BIP-03)
**AI Model Resilience Framework**
- Circuit breaker patterns for model failures
- Health monitoring and availability tracking
- Fallback strategies and recovery mechanisms
- Automated retry logic with exponential backoff

```typescript
import { CircuitBreaker, HealthChecker } from '@hivellm/resilience-framework';

const breaker = new CircuitBreaker({
  threshold: 5,
  timeout: 30000,
  resetTimeout: 60000
});
```

#### 📝 `packages/shared-types/`
**Shared TypeScript Types**
- Common data structures and interfaces
- API type definitions
- Governance-related types
- Cryptographic interfaces

#### 🧪 `packages/testing-utils/`
**Testing Utilities**
- Test helpers and mocks
- Common testing patterns
- Fixtures for consistent testing
- Utilities for package testing

## 🛠️ Development

### Prerequisites

- **Node.js**: 18.x or higher
- **PNPM**: 10.15.1 or higher
- **TypeScript**: 5.x

### Quick Start

```bash
# Clone the repository
git clone https://github.com/hivellm/hive-ts-workspace.git
cd hive-ts-workspace

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Development mode
pnpm dev
```

### Available Scripts

```bash
# Build and Development
pnpm build          # Build all packages
pnpm dev            # Development mode with hot reload
pnpm clean          # Clean all build artifacts

# Testing
pnpm test           # Run all tests
pnpm test:watch     # Watch mode testing
pnpm test:coverage  # Generate coverage reports

# Code Quality
pnpm lint           # Lint all packages
pnpm lint:fix       # Fix linting issues
pnpm format         # Format code with Prettier
pnpm type-check     # TypeScript type checking
```

### Package Development

```bash
# Work on specific package
cd packages/crypto-utils
pnpm dev

# Test specific package
cd packages/bip-system
pnpm test

# Build specific package
cd packages/resilience-framework
pnpm build
```

## 🏗️ Architecture

### Monorepo Structure

```
hive-ts-workspace/
├── packages/
│   ├── bip-system/           # BIP management and workflows
│   ├── crypto-utils/         # ECC cryptography and signatures
│   ├── resilience-framework/ # AI model resilience patterns
│   ├── shared-types/         # Common TypeScript types
│   └── testing-utils/        # Testing utilities and helpers
├── package.json             # Root workspace configuration
├── pnpm-workspace.yaml      # PNPM workspace setup
├── turbo.json              # Turborepo build configuration
├── tsconfig.json           # Base TypeScript configuration
├── eslint.config.js        # ESLint configuration
└── vitest.config.ts        # Vitest test configuration
```

### Technology Stack

- **📦 Monorepo**: Turborepo for efficient builds and caching
- **🔷 TypeScript**: 5.x with strict mode enabled
- **🧪 Testing**: Vitest for fast, modern testing
- **📏 Linting**: ESLint + Prettier for code quality
- **🔐 Cryptography**: secp256k1 elliptic curve cryptography
- **⚡ Build System**: Optimized with parallel execution

## 🔗 HiveLLM Ecosystem

This TypeScript workspace is part of the HiveLLM ecosystem:

| Repository | Description | Status |
|------------|-------------|--------|
| **[hive-gov](../hive-gov)** | Governance, BIPs, minutes, proposals | Active |
| **[hive-cursor-extension](../hive-cursor-extension)** | BIP-00 Cursor IDE extension | In Development |
| **[hive-umicp](../hive-umicp)** | BIP-05 Universal Matrix Protocol | In Implementation |
| **[cmmv-hive](../cmmv-hive)** | Core infrastructure (legacy) | Archived |

## 🚀 Usage Examples

### Cryptographic Operations

```typescript
import { ECC, VoteHasher } from '@hivellm/crypto-utils';

// Generate key pair
const keyPair = ECC.generateKeyPair();

// Sign vote
const vote = { proposalId: "BIP-001", modelId: "claude", weight: 8 };
const signature = ECC.sign(vote, keyPair.privateKey);

// Generate vote hash
const hash = VoteHasher.generate(vote);
```

### BIP Management

```typescript
import { BIPManager, ProposalConverter } from '@hivellm/bip-system';

// Convert proposal to BIP
const bip = await ProposalConverter.proposalToBIP(proposal);

// Track BIP progress
const status = await BIPManager.getImplementationStatus('BIP-001');
```

### Resilience Patterns

```typescript
import { CircuitBreaker, RetryManager } from '@hivellm/resilience-framework';

// Create circuit breaker for AI model calls
const breaker = new CircuitBreaker({
  threshold: 5,
  timeout: 30000
});

// Add retry logic
const retryManager = new RetryManager({
  maxRetries: 3,
  backoffFactor: 2
});
```

## 🧪 Testing

### Running Tests

```bash
# All packages
pnpm test

# Specific package
pnpm --filter crypto-utils test

# With coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

### Test Structure

Each package includes:
- **Unit Tests**: Individual function testing
- **Integration Tests**: Package interaction testing
- **Performance Tests**: Benchmarking critical operations
- **Security Tests**: Cryptographic validation

## 🔧 Configuration

### TypeScript Configuration

All packages inherit from the root `tsconfig.json` with:
- Strict mode enabled
- ES2022 target
- Module resolution optimized
- Path mapping for package imports

### Build Configuration

Turborepo optimizes builds with:
- Parallel execution
- Intelligent caching
- Dependency-aware building
- Development hot reload

## 📈 Performance

### Build Performance
- **Cold Build**: ~30 seconds for all packages
- **Incremental Build**: ~5 seconds with Turbo cache
- **Hot Reload**: <1 second for development changes

### Package Sizes
- **crypto-utils**: ~15KB minified
- **bip-system**: ~25KB minified
- **resilience-framework**: ~20KB minified
- **shared-types**: ~5KB (types only)
- **testing-utils**: ~10KB minified

## 🤝 Contributing

1. **Development**: Follow TypeScript strict mode and ESLint rules
2. **Testing**: Maintain 90%+ test coverage
3. **Documentation**: Update package READMEs with changes
4. **Commits**: Use conventional commit format

### Adding New Packages

```bash
# Create new package
mkdir packages/new-package
cd packages/new-package

# Use shared configuration
cp ../shared-types/package.json ./package.json
# Update name and description

# Add to workspace
# Edit root pnpm-workspace.yaml if needed
```

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

## 🏷️ Version

Current version: **2.0.0**

---

**BIP-02 Implementation completed**: 2025-09-17  
**Repository migrated from**: cmmv-hive  
**Status**: ✅ Production Ready
