# reviewless

PR Review Priority Analyzer - helps prioritize which files in a PR need the most careful review.

## Design Doc

https://docs.google.com/document/d/1n3ts3zwVsQ9jRC-0rnE67XilJ6gwbY__pcpTgFM02iU/edit?usp=sharing

## Usage

```bash
npm start -- owner/repo#123       # Analyze a PR
npm start -- owner/repo#123 -v    # Verbose mode with factors
```

## Installation

```bash
npm install
```

## Authentication

Provide a GitHub token in one of these ways:

1. **Environment variable** (recommended):
   ```bash
   export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
   ```

2. **Command line flag**:
   ```bash
   npm start -- --token ghp_xxxxxxxxxxxx owner/repo#123
   ```

3. **GitHub CLI** (if installed):
   ```bash
   gh auth login
   ```

To create a token: https://github.com/settings/tokens
Required scope: `repo` (private repos) or `public_repo` (public only)
