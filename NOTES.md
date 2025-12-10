# reviewless - PR Review Priority Analyzer

## Location
`/home/zipwow/reviewless`

## Status
Working - CLI tool is functional

## Usage
```bash
npm start -- owner/repo#123       # Analyze a PR
npm start -- owner/repo#123 -v    # Verbose mode with factors
```

## Architecture
- `src/github.ts` - GitHub API client using `@octokit/rest`
- `src/likelihood.ts` - Bug likelihood scoring (complexity, test risk, size)
- `src/severity.ts` - Bug severity scoring (security, performance, criticality)
- `src/analyzer.ts` - Combines scores into final priority
- `src/cli.ts` - CLI interface with table output, auto-fetches token via `gh auth token`

## Scoring (based on design doc)
- Modified tests = highest risk signal
- Cyclomatic complexity from patch
- Security patterns (auth, SQL, XSS, etc.)
- File criticality (entry points, migrations, payment code)

## Remaining Task
Generate example output for 5 langgraph PRs and save to file:
- PRs: 6572, 6562, 6554, 6553, 6551

## Allowlist Issue
The pattern `Bash(npm:*)` doesn't work for prefix matching. Had to add explicit `Bash(npm start:*)`.
