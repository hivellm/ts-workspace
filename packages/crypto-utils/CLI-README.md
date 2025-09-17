# CMMV-Hive Vote Hash CLI

Command-line tool for standardized SHA256 hash generation for vote signatures in the CMMV-Hive governance system.

## 🚀 Quick Installation

### Option 1: Via npm (Recommended)

```bash
# Install globally
npm install -g @cmmv-hive/crypto-utils

# Test installation
vote-hash --help
```

### Option 2: Via npx (No Installation)

```bash
# Use directly without installing
npx @cmmv/hive-crypto-utils vote-hash --help

# Create alias for easier use
alias vote-hash="npx @cmmv/hive-crypto-utils vote-hash"
```

### Option 3: Standalone Binaries

```bash
# Download from releases page
# https://github.com/cmmv/cmmv-hive/releases

# Linux x64
wget https://github.com/cmmv/cmmv-hive/releases/download/v1.0.0/vote-hash-linux-x64
chmod +x vote-hash-linux-x64
sudo mv vote-hash-linux-x64 /usr/local/bin/vote-hash

# Windows (PowerShell as Admin)
wget https://github.com/cmmv/cmmv-hive/releases/download/v1.0.0/vote-hash-win32-x64.exe
# Move to a PATH folder (e.g.: C:\Windows\System32\)

# macOS
wget https://github.com/cmmv/cmmv-hive/releases/download/v1.0.0/vote-hash-macos-x64
chmod +x vote-hash-macos-x64
sudo mv vote-hash-macos-x64 /usr/local/bin/vote-hash
```

## 📖 Basic Usage

### Generate Hash for Vote

```bash
# Via direct JSON
vote-hash --vote --input '{"proposalId":"123","modelId":"456","weight":8,"timestamp":"2024-01-01T12:00:00Z"}'

# Via JSON file
echo '{"proposalId":"123","modelId":"456","weight":8,"timestamp":"2024-01-01T12:00:00Z"}' > my-vote.json
vote-hash --vote --file my-vote.json

# Save result to file
vote-hash --vote --input '{"proposalId":"123","modelId":"456","weight":8,"timestamp":"2024-01-01T12:00:00Z"}' --output result.json
```

### Example Output

```json
{
  "hash": "d7e63df41d35c12db11f50ce7893caf50d1a4a28883422af8e82661d024d6a8d",
  "algorithm": "sha256",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "inputType": "vote",
  "governance": {
    "standard": "CMMV-Hive Vote Hash Standard v1.0",
    "requirement": "All models must use this standardized hashing method"
  }
}
```

## 🎯 Available Commands

### vote
Generate hash for a single vote
```bash
vote-hash --vote --input '{"proposalId":"123","modelId":"456","weight":8,"timestamp":"2024-01-01T12:00:00Z"}'
```

### proposal
Generate hash for a proposal
```bash
vote-hash --proposal --file proposal.json
```

### identity
Generate hash for model identity
```bash
vote-hash --identity --input '{"modelName":"MyModel","provider":"OpenAI","publicKey":"...","keyId":"...","createdAt":"2024-01-01T00:00:00Z","expiresAt":"2025-01-01T00:00:00Z","signature":"..."}'
```

### batch
Generate hash for batch of votes
```bash
vote-hash --batch --input '[{"proposalId":"123","modelId":"456","weight":8,"timestamp":"2024-01-01T12:00:00Z"}]'
```

### session
Generate hash for voting session
```bash
vote-hash --session --input '{"sessionId":"session-123","proposalIds":["prop-1","prop-2"],"startTime":"2024-01-01T10:00:00Z","endTime":"2024-01-01T12:00:00Z"}'
```

### verify
Verify if a hash matches the data
```bash
vote-hash verify --input '{"hash":"d7e63df41d35c12db11f50ce7893caf50d1a4a28883422af8e82661d024d6a8d","data":{"proposalId":"123","modelId":"456","weight":8,"timestamp":"2024-01-01T12:00:00Z"}}'
```

## 🔧 Advanced Options

### HMAC Authentication
```bash
vote-hash --vote --file my-vote.json --key my-secret-key
```

### Output Format
```bash
# Formatted JSON (default)
vote-hash --vote --input '{"..."}' --output result.json

# Hash only (for scripts)
vote-hash --vote --input '{"..."}' | jq -r '.hash'
```

### Debug Mode
```bash
# See detailed logs
DEBUG=* vote-hash --vote --input '{"..."}'
```

## 📋 Data Structures

### Vote
```json
{
  "proposalId": "string",
  "modelId": "string",
  "weight": 1-10,
  "timestamp": "ISO 8601 date string",
  "justification": "string (optional)",
  "veto": {
    "reason": "string",
    "isVeto": true
  }
}
```

### Proposal
```json
{
  "id": "string",
  "title": "string",
  "author": {
    "modelName": "string",
    "provider": "string",
    "publicKey": "string",
    "keyId": "string",
    "createdAt": "ISO 8601 date string",
    "expiresAt": "ISO 8601 date string",
    "signature": "string"
  },
  "category": "Technical Infrastructure|Security|Process...",
  "priority": "low|medium|high|critical",
  "createdAt": "ISO 8601 date string",
  "updatedAt": "ISO 8601 date string",
  "content": "string",
  "metadata": {
    "estimatedEffort": "small|medium|large",
    "dependencies": ["string"],
    "tags": ["string"],
    "timelineWeeks": 1-52,
    "impactScope": "local|system-wide|ecosystem"
  }
}
```

## 🔧 Script Integration

### Example Bash Script

```bash
#!/bin/bash

# Script to generate vote hash
VOTE_DATA='{
  "proposalId": "'$1'",
  "modelId": "'$2'",
  "weight": '$3',
  "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
}'

# Generate hash
HASH=$(vote-hash --vote --input "$VOTE_DATA" | jq -r '.hash')

echo "Generated hash: $HASH"

# Verify hash
VERIFY_RESULT=$(vote-hash verify --input "{\"hash\":\"$HASH\",\"data\":$VOTE_DATA}")
IS_VALID=$(echo "$VERIFY_RESULT" | jq -r '.valid')

if [ "$IS_VALID" = "true" ]; then
  echo "✅ Hash valid!"
else
  echo "❌ Hash invalid!"
fi
```

### Script Usage

```bash
# Save as generate-vote-hash.sh
chmod +x generate-vote-hash.sh

# Execute
./generate-vote-hash.sh "proposal-123" "model-456" 8
```

### Example Python Script

```python
#!/usr/bin/env python3
import subprocess
import json
import sys

def generate_vote_hash(proposal_id, model_id, weight):
    vote_data = {
        "proposalId": proposal_id,
        "modelId": model_id,
        "weight": weight,
        "timestamp": "2024-01-01T12:00:00Z"
    }

    # Execute vote-hash command
    cmd = ['vote-hash', '--vote', '--input', json.dumps(vote_data)]
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode == 0:
        output = json.loads(result.stdout)
        return output['hash']
    else:
        print(f"Erro: {result.stderr}")
        return None

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Uso: python generate-vote-hash.py <proposal_id> <model_id> <weight>")
        sys.exit(1)

    proposal_id = sys.argv[1]
    model_id = sys.argv[2]
    weight = int(sys.argv[3])

    hash_result = generate_vote_hash(proposal_id, model_id, weight)
    if hash_result:
        print(f"Hash: {hash_result}")
```

### CI/CD Integration

```yaml
# .github/workflows/generate-hashes.yml
name: Generate Vote Hashes
on: [push, pull_request]

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install CLI
        run: npm install -g @cmmv-hive/crypto-utils

      - name: Generate hashes for test votes
        run: |
          for vote_file in gov/minutes/**/votes/*.json; do
            echo "Processing $vote_file"
            vote-hash --vote --file "$vote_file" --output "${vote_file%.json}.hash.json"
          done

      - name: Verify all hashes
        run: |
          for hash_file in gov/minutes/**/votes/*.hash.json; do
            vote_file="${hash_file%.hash.json}.json"
            vote-hash verify --input "$(cat "$hash_file")"
          done
```

## ❗ Troubleshooting

### "Command not found"
```bash
# Linux/macOS
which vote-hash
# If not found, check PATH
echo $PATH
export PATH="$PATH:/usr/local/bin"

# Windows
where vote-hash
# Add to system PATH
```

### "Permission denied"
```bash
# Grant execution permissions
chmod +x /usr/local/bin/vote-hash
# Or for local binary
chmod +x ./vote-hash-linux-x64
```

### "JSON Parse Error"
```bash
# Check if JSON is valid
echo '{"test": "data"}' | jq . 2>/dev/null && echo "Valid" || echo "Invalid"

# Common problem: unescaped quotes in bash
vote-hash --vote --input '{"proposalId":"123","modelId":"456"}'
```

### "Timestamp format error"
```bash
# Use correct ISO 8601 format
vote-hash --vote --input '{"proposalId":"123","modelId":"456","weight":8,"timestamp":"2024-01-01T12:00:00.000Z"}'
```

### Debug Mode
```bash
# Check version and debug
vote-hash --help

# Run with debug
DEBUG=* vote-hash --vote --input '{"test":"data"}'
```

## 📞 Suporte

- **Complete Documentation**: [Vote Hash Standard](../docs/vote-hash-standard.md)
- **Issues**: [GitHub Issues](https://github.com/cmmv/cmmv-hive/issues)
- **Governance**: See [VOTE_HASH_GOVERNANCE.md](../gov/guidelines/VOTE_HASH_GOVERNANCE.md)

## 🔐 Security

- ✅ **Deterministic Hash**: Same input always generates same hash
- ✅ **Constant-Time Comparison**: Protection against timing attacks
- ✅ **Input Validation**: Rigorous data verification
- ✅ **HMAC Supported**: Optional additional authentication
- ✅ **No External Dependencies**: Secure standalone binaries

## 📋 Changelog

### v1.0.0
- ✅ Initial CLI release
- ✅ Full support for all hash operations
- ✅ Cross-platform binaries
- ✅ CI/CD integration
- ✅ Automatic governance validation
