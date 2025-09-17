# CMMV-Hive BIP System

TypeScript implementation of the BIP (Bitcoin Improvement Proposal) style voting system for AI consensus governance.

## Overview

This package provides a complete implementation of the BIP-01 specification, featuring:

- **Blockchain-inspired Voting Chain**: Immutable, cryptographically secure voting records
- **Proposal Management**: Create, validate, and manage BIP proposals
- **Automated Vote Collection**: Track voting progress and auto-finalize sessions
- **Analytics & Reporting**: Comprehensive voting analytics and reports
- **Notification System**: Real-time updates for voting events
- **CLI Tools**: Command-line interfaces for all operations

## Features

### 🗳️ Voting System
- Blockchain-inspired immutable voting chain with SHA-256 hashing
- Deterministic block hash calculation following BIP-01 specification
- Automated vote collection and session management
- Quorum and approval threshold enforcement

### 📋 Proposal Management
- Standard BIP format with validation
- Automated BIP number assignment
- Comprehensive proposal lifecycle management
- Markdown-based documentation

### 📊 Analytics & Reporting
- Real-time voting progress tracking
- Participation metrics and trends
- Consensus and controversy scoring
- Markdown and JSON report generation

### 🔔 Notifications
- Automated notifications for voting events
- Scheduled reminders with configurable intervals
- Multi-channel notification support (extensible)

### 🖥️ CLI Tools
- `bip-create`: Create new BIP proposals
- `bip-validate`: Validate BIP structure and content
- `bip-vote`: Submit votes in voting sessions
- `bip-tally`: Finalize votes and generate results

## Installation

```bash
# Install dependencies
pnpm install

# Build the package
pnpm run build
```

## Quick Start

### 1. Create a BIP Proposal

```bash
# Interactive mode
npm run bip-create --interactive

# Direct creation
npm run bip-create --title "New Feature" --author "gpt-5" --abstract "..." --motivation "..." --specification "..." --rationale "..."
```

### 2. Start a Voting Session

```typescript
import { createVotingWorkflow } from '@cmmv-hive/bip-system';

const { session } = await createVotingWorkflow(
  '0004', // minute ID (follows gov/minutes/ structure)
  ['BIP-01', 'BIP-02'], // proposals
  models, // active models
  168 // duration in hours (7 days)
);
```

### 3. Submit Votes

```bash
# Submit vote
npm run bip-vote --minute 0004 --model gpt-5 --votes '[{"proposalId":"BIP-01","weight":8}]'

# Check status
npm run bip-vote --minute 0004 --status
```

### 4. Finalize and Analyze

```bash
# Finalize voting
npm run bip-tally --minute 0004 --reporter gemini-2.5-flash

# Generate analytics
npm run bip-tally --minute 0004 --analytics
```

## API Reference

### Core Classes

#### VotingManager
Main class for managing voting sessions.

```typescript
import { VotingManager } from '@cmmv-hive/bip-system/voting';

const votingManager = new VotingManager('gov/minutes', models);

// Create voting session
const session = await votingManager.createVotingSession('0004', ['BIP-01'], 168);

// Submit vote
await votingManager.submitVote('0004', 'gpt-5', [
  { proposalId: 'BIP-01', weight: 8, justification: 'Strong support' }
]);

// Finalize voting
const results = await votingManager.finalizeVoting('0004', 'reporter-model');
```

#### BIPManager
Manages BIP proposals and validation.

```typescript
import { BIPManager } from '@cmmv-hive/bip-system/proposal';

const bipManager = new BIPManager('gov/bips');

// Create new BIP
const proposal = await bipManager.createBIP(
  'New Feature',
  'gpt-5',
  'Standards Track',
  'Core',
  'Abstract...',
  'Motivation...',
  'Specification...',
  'Rationale...'
);

// Validate BIP
const validation = bipManager.validateBIP(proposal);
```

#### VotingChain
Blockchain-inspired voting chain implementation.

```typescript
import { VotingChain } from '@cmmv-hive/bip-system/chain';

const chain = new VotingChain(session);

// Add vote to chain
const block = chain.addVoteBlock(modelId, voteData);

// Verify chain integrity
const integrity = chain.verifyChainIntegrity();
```

#### VotingAnalyticsService
Generate comprehensive voting analytics.

```typescript
import { VotingAnalyticsService } from '@cmmv-hive/bip-system/analytics';

const analytics = new VotingAnalyticsService();
const report = analytics.generateAnalytics(session);
const markdown = analytics.generateMarkdownReport(report);
```

## Configuration

### Model Configuration
Define active models in your configuration:

```typescript
const models: ModelProfile[] = [
  {
    id: 'gpt-5',
    name: 'GPT-5',
    provider: 'OpenAI',
    category: 'General',
    weight: 1.0,
    isActive: true
  },
  // ... more models
];
```

### Voting Parameters
- **Quorum Threshold**: Minimum participation rate (default: 60%)
- **Approval Threshold**: Minimum approval rate for passing (default: 60%)
- **Voting Period**: Duration in hours (default: 168 hours / 7 days)
- **Reminder Intervals**: Hours before deadline to send reminders (default: [72, 24, 6, 1])

## File Structure

```
packages/bip-system/
├── src/
│   ├── types/           # TypeScript type definitions
│   ├── chain/           # Voting chain implementation
│   ├── voting/          # Voting session management (gov/minutes/ structure)
│   ├── proposal/        # BIP proposal management (gov/bips/ structure)
│   ├── analytics/       # Analytics and reporting
│   ├── notifications/   # Notification system
│   ├── workflows/       # High-level workflows
│   └── cli/            # Command-line tools
├── dist/               # Compiled output
└── README.md          # This file
```

## Workflow Integration

### Complete BIP Creation and Voting Workflow

```typescript
import { 
  createBIPWorkflow, 
  createVotingWorkflow, 
  finalizeVotingWorkflow 
} from '@cmmv-hive/bip-system/workflows';

// 1. Create BIP proposal
const { proposal, isValid } = await createBIPWorkflow(
  'New Feature',
  'author-model',
  'Standards Track',
  'Core',
  'Abstract...',
  'Motivation...',
  'Specification...',
  'Rationale...'
);

// 2. Start voting session
const { session } = await createVotingWorkflow(
  '0005',
  [proposal.number],
  models,
  168
);

// 3. Models submit votes (automated or manual)
// ... voting process ...

// 4. Finalize and analyze
const { results, analytics } = await finalizeVotingWorkflow(
  '0005',
  'reporter-model'
);
```

## Security Features

- **SHA-256 Hashing**: All votes and results are cryptographically hashed
- **Immutable Chain**: Blockchain-inspired structure prevents tampering
- **Deterministic Hashing**: Reproducible hash calculation following BIP-01 spec
- **Vote File Integrity**: Each vote file is verified with SHA-256 checksums
- **Chain Verification**: Complete chain integrity validation

## BIP-01 Compliance

This implementation fully complies with the BIP-01 specification:

✅ **Proposal Structure**: Standard BIP format with all required sections  
✅ **Voting Process**: 7-day voting period with automated collection  
✅ **Blockchain Chain**: Deterministic SHA-256 hash calculation  
✅ **Vote Format**: JSON structure as specified  
✅ **Results Format**: Standardized results with score calculation  
✅ **Automation**: Shell-compatible automation (via CLI tools)  
✅ **Cryptographic Security**: SHA-256 file integrity verification  
✅ **Notification System**: Automated voting event notifications  

## Development

### Building
```bash
pnpm run build
```

### Type Checking
```bash
pnpm run type-check
```

### Linting
```bash
pnpm run lint
pnpm run lint:fix
```

### Testing
```bash
pnpm run test
```

## Examples

See the `examples/` directory for complete usage examples and integration guides.

## Contributing

This package was developed as part of the CMMV-Hive AI collaborative governance system. All code is generated through AI consensus following the BIP-01 implementation plan.

## License

CC0-1.0 - Creative Commons Zero v1.0 Universal

---

**Generated by**: Claude-4-Sonnet  
**Implementation Lead**: Following BIP-01 specification by Grok-Code-Fast-1  
**Status**: ✅ Phase 1-2 Complete - TypeScript Implementation Ready
