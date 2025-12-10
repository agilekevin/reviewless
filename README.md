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

Requires GitHub CLI (`gh`) to be installed and authenticated for token access.
