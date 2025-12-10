# reviewless - Example Output

Example analysis of 5 LangGraph PRs demonstrating the PR Review Priority Analyzer.

---

## PR #6572: Fix: Command(goto) now overrides explicit edges from add_edge()

```
Summary:
  Total files: 1
  Average score: 3
  Critical: 0  High: 0  Medium: 0  Low: 1

┌──────────┬───────┬────────────────────────────────────────┬─────────┬──────────────────────────────────────────────────┐
│ Priority │ Score │ File                                   │ Changes │ Factors                                          │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ LOW      │ 3     │ libs/langgraph/langgraph/graph/state.… │ +41     │ Small change (41 lines); Test file not modified  │
│          │       │                                        │         │ (likely covered by existing tests)               │
└──────────┴───────┴────────────────────────────────────────┴─────────┴──────────────────────────────────────────────────┘
```

---

## PR #6562: chore: Flip default in BaseCache

```
Summary:
  Total files: 14
  Average score: 7
  Critical: 0  High: 0  Medium: 1  Low: 13

┌──────────┬───────┬────────────────────────────────────────┬─────────┬──────────────────────────────────────────────────┐
│ Priority │ Score │ File                                   │ Changes │ Factors                                          │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ MEDIUM   │ 35    │ libs/prebuilt/tests/test_react_agent.… │ +2      │ Modified existing test (highest risk)            │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ LOW      │ 15    │ ...aph/tests/__snapshots__/test_large… │ +4      │ Low complexity (5 decision points); Security:    │
│          │       │                                        │         │ token handling, access control; Test file not    │
│          │       │                                        │         │ modified (likely covered by existing tests)      │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ LOW      │ 13    │ libs/cli/uv.lock                       │ +74     │ Small change (74 lines); Security: URL handling, │
│          │       │                                        │         │ file upload; Test file not modified (likely      │
│          │       │                                        │         │ covered by existing tests)                       │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ LOW      │ 10    │ libs/checkpoint/langgraph/cache/base/… │ +2      │ Security: serialization code; Performance: Cache │
│          │       │                                        │         │ code; Test file not modified (likely covered by  │
│          │       │                                        │         │ existing tests)                                  │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ LOW      │ 10    │ libs/checkpoint/uv.lock                │ +817    │ Large change (817 lines); Test file not modified │
│          │       │                                        │         │ (likely covered by existing tests)               │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ LOW      │ 10    │ libs/langgraph/uv.lock                 │ +674    │ Large change (674 lines); Test file not modified │
│          │       │                                        │         │ (likely covered by existing tests)               │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ LOW      │ 0     │ libs/checkpoint-postgres/pyproject.to… │ +4      │ Test file not modified (likely covered by        │
│          │       │                                        │         │ existing tests)                                  │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ LOW      │ 0     │ libs/checkpoint-postgres/uv.lock       │ +4      │ Test file not modified (likely covered by        │
│          │       │                                        │         │ existing tests)                                  │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ LOW      │ 0     │ libs/checkpoint-sqlite/pyproject.toml  │ +4      │ Test file not modified (likely covered by        │
│          │       │                                        │         │ existing tests)                                  │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ LOW      │ 0     │ libs/checkpoint-sqlite/uv.lock         │ +6      │ Test file not modified (likely covered by        │
│          │       │                                        │         │ existing tests)                                  │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ LOW      │ 0     │ libs/checkpoint/pyproject.toml         │ +2      │ Test file not modified (likely covered by        │
│          │       │                                        │         │ existing tests)                                  │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ LOW      │ 0     │ libs/langgraph/pyproject.toml          │ +4      │ Test file not modified (likely covered by        │
│          │       │                                        │         │ existing tests)                                  │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ LOW      │ 0     │ libs/prebuilt/pyproject.toml           │ +4      │ Test file not modified (likely covered by        │
│          │       │                                        │         │ existing tests)                                  │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ LOW      │ 0     │ libs/prebuilt/uv.lock                  │ +10     │ Test file not modified (likely covered by        │
│          │       │                                        │         │ existing tests)                                  │
└──────────┴───────┴────────────────────────────────────────┴─────────┴──────────────────────────────────────────────────┘
```

---

## PR #6554: fix: replace bare except with specific exceptions in async queue

```
Summary:
  Total files: 1
  Average score: 5
  Critical: 0  High: 0  Medium: 0  Low: 1

┌──────────┬───────┬────────────────────────────────────────┬─────────┬──────────────────────────────────────────────────┐
│ Priority │ Score │ File                                   │ Changes │ Factors                                          │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ LOW      │ 5     │ libs/langgraph/langgraph/_internal/_q… │ +2      │ Performance: Queue handling; Test file not       │
│          │       │                                        │         │ modified (likely covered by existing tests)      │
└──────────┴───────┴────────────────────────────────────────┴─────────┴──────────────────────────────────────────────────┘
```

---

## PR #6553: Add unified spell_check targets across all libs

```
Summary:
  Total files: 14
  Average score: 3
  Critical: 0  High: 0  Medium: 1  Low: 13

┌──────────┬───────┬────────────────────────────────────────┬─────────┬──────────────────────────────────────────────────┐
│ Priority │ Score │ File                                   │ Changes │ Factors                                          │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ MEDIUM   │ 30    │ libs/langgraph/uv.lock                 │ +151    │ Medium change (151 lines); Security:             │
│          │       │                                        │         │ cryptography code, URL handling, file upload;    │
│          │       │                                        │         │ Test file not modified (likely covered by        │
│          │       │                                        │         │ existing tests)                                  │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ LOW      │ 8     │ libs/cli/Makefile                      │ +8      │ Performance: Database query; Test file not       │
│          │       │                                        │         │ modified (likely covered by existing tests)      │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ LOW      │ 0     │ Makefile                               │ +20     │ Test file not modified (likely covered by        │
│          │       │                                        │         │ existing tests)                                  │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ LOW      │ 0     │ libs/checkpoint-postgres/Makefile      │ +8      │ Test file not modified (likely covered by        │
│          │       │                                        │         │ existing tests)                                  │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ LOW      │ 0     │ libs/checkpoint-postgres/pyproject.to… │ +4      │ Test file not modified (likely covered by        │
│          │       │                                        │         │ existing tests)                                  │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ LOW      │ 0     │ libs/checkpoint-sqlite/Makefile        │ +8      │ Test file not modified (likely covered by        │
│          │       │                                        │         │ existing tests)                                  │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ LOW      │ 0     │ libs/checkpoint-sqlite/pyproject.toml  │ +4      │ Test file not modified (likely covered by        │
│          │       │                                        │         │ existing tests)                                  │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ LOW      │ 0     │ libs/checkpoint/Makefile               │ +8      │ Test file not modified (likely covered by        │
│          │       │                                        │         │ existing tests)                                  │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ LOW      │ 0     │ libs/checkpoint/pyproject.toml         │ +4      │ Test file not modified (likely covered by        │
│          │       │                                        │         │ existing tests)                                  │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ LOW      │ 0     │ libs/cli/pyproject.toml                │ +4      │ Test file not modified (likely covered by        │
│          │       │                                        │         │ existing tests)                                  │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ LOW      │ 0     │ libs/langgraph/pyproject.toml          │ +1      │ Test file not modified (likely covered by        │
│          │       │                                        │         │ existing tests)                                  │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ LOW      │ 0     │ libs/prebuilt/pyproject.toml           │ +4      │ Test file not modified (likely covered by        │
│          │       │                                        │         │ existing tests)                                  │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ LOW      │ 0     │ libs/sdk-py/Makefile                   │ +8      │ Test file not modified (likely covered by        │
│          │       │                                        │         │ existing tests)                                  │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ LOW      │ 0     │ libs/sdk-py/pyproject.toml             │ +4      │ Test file not modified (likely covered by        │
│          │       │                                        │         │ existing tests)                                  │
└──────────┴───────┴────────────────────────────────────────┴─────────┴──────────────────────────────────────────────────┘
```

---

## PR #6551: wip: first pass at response schema on interrupts

```
Summary:
  Total files: 4
  Average score: 19
  Critical: 0  High: 0  Medium: 1  Low: 3

┌──────────┬───────┬────────────────────────────────────────┬─────────┬──────────────────────────────────────────────────┐
│ Priority │ Score │ File                                   │ Changes │ Factors                                          │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ MEDIUM   │ 40    │ libs/langgraph/tests/test_pregel.py    │ +195    │ Modified existing test (highest risk); Medium    │
│          │       │                                        │         │ change (195 lines)                               │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ LOW      │ 18    │ libs/langgraph/langgraph/_internal/_p… │ +36     │ Small change (36 lines); Test modified along     │
│          │       │                                        │         │ with source (detected via import) (verify test   │
│          │       │                                        │         │ intent)                                          │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ LOW      │ 13    │ libs/sdk-py/langgraph_sdk/schema.py    │ +4      │ Critical: Schema definition; Test file not       │
│          │       │                                        │         │ modified (likely covered by existing tests)      │
├──────────┼───────┼────────────────────────────────────────┼─────────┼──────────────────────────────────────────────────┤
│ LOW      │ 3     │ libs/langgraph/langgraph/types.py      │ +68     │ Small change (68 lines); Test file not modified  │
│          │       │                                        │         │ (likely covered by existing tests)               │
└──────────┴───────┴────────────────────────────────────────┴─────────┴──────────────────────────────────────────────────┘
```

---

## Summary

| PR | Title | Files | Avg | Max | Critical | High | Medium | Low |
|----|-------|-------|-----|-----|----------|------|--------|-----|
| [#6572](https://github.com/langchain-ai/langgraph/pull/6572) | Fix: Command(goto) now overrides explicit edges | 1 | 3 | 3 | 0 | 0 | 0 | 1 |
| [#6562](https://github.com/langchain-ai/langgraph/pull/6562) | chore: Flip default in BaseCache | 14 | 7 | 35 | 0 | 0 | 1 | 13 |
| [#6554](https://github.com/langchain-ai/langgraph/pull/6554) | fix: replace bare except with specific exceptions | 1 | 5 | 5 | 0 | 0 | 0 | 1 |
| [#6553](https://github.com/langchain-ai/langgraph/pull/6553) | Add unified spell_check targets across all libs | 14 | 3 | 30 | 0 | 0 | 1 | 13 |
| [#6551](https://github.com/langchain-ai/langgraph/pull/6551) | wip: first pass at response schema on interrupts | 4 | 19 | 40 | 0 | 0 | 1 | 3 |

**Review Priority Recommendation:**
1. [**PR #6551**](https://github.com/langchain-ai/langgraph/pull/6551) (Max: 40) - Highest priority: modified existing tests, import analysis detected test-source coupling
2. [**PR #6562**](https://github.com/langchain-ai/langgraph/pull/6562) (Max: 35) - Contains modified test file and cache-related changes
3. [**PR #6553**](https://github.com/langchain-ai/langgraph/pull/6553) (Max: 30) - Lock file with security-related dependencies
4. [**PR #6554**](https://github.com/langchain-ai/langgraph/pull/6554) (Max: 5) - Small fix in queue handling code
5. [**PR #6572**](https://github.com/langchain-ai/langgraph/pull/6572) (Max: 3) - Small focused fix in graph state

---

## Analysis vs Design Doc Goals

### Bug Likelihood Heuristics

| Doc Goal | Implementation | Status |
|----------|----------------|--------|
| **Cyclomatic Complexity** - "measure number of possible paths through code" | Counts decision points (if, for, while, switch, etc.) in patches | Implemented |
| **Unchanged tests** - "least risky, indicates benign change" | Detects when test file not in PR, reports "likely covered by existing tests" | Implemented |
| **Modified tests** - "highest risk, danger of changing tests to fit code" | 40 points + "Modified existing test (highest risk)" | Implemented |
| **New tests** - "medium risk, may indicate novel functionality" | 20 points + "New test file (medium risk)" | Implemented |
| **Deleted tests** - (not in doc, added as logical extension) | 50 points + "Deleted test file (critical risk)" | Implemented |

### Bug Severity Heuristics

| Doc Goal | Implementation | Status |
|----------|----------------|--------|
| **Security** - "static code analysis" | Pattern matching for auth, SQL, XSS, crypto, etc. | Implemented |
| **Performance** - "hot paths from prod" | Pattern matching for cache, queue, worker, loops | Partial (no prod data) |
| **Business Impact** - "rank your modules" | Critical file patterns (entry points, migrations, payment) | Implemented |

### Coverage Analysis (New)

| Feature | Description | Example |
|---------|-------------|---------|
| **Filename convention mapping** | Infers test files from naming patterns | `_pregel.py` -> `test_pregel.py` |
| **Import-based detection** | Parses test imports to find source coverage | PR #6551: detected `test_pregel.py` imports `_pregel` |

### What's Working Well

1. **PR #6551** correctly identified as highest priority:
   - Modified test file flagged as "highest risk"
   - Import analysis detected that `_pregel.py` is covered by `test_pregel.py`
   - Score increased from 3 to 18 for the source file due to test coupling

2. **PR #6572** correctly identified as lowest priority:
   - Small change, no test modifications
   - "Test file not modified (likely covered by existing tests)"

3. **PR #6562** flagged modified test file even though it's only +2 lines

### Known Limitations

1. **Lock files scored on security patterns** - `uv.lock` files match patterns like `crypt`, `http://` in dependency names
2. **No actual coverage data** - Relying on heuristics, not real test execution
3. **False positives on snapshots** - Snapshot files can trigger complexity scores

### Ideas from Doc Not Yet Implemented

| Idea | Description | Difficulty |
|------|-------------|------------|
| Test similarity/uniqueness | "Measure how similar new tests are to previous tests" | High |
| Feature embeddings | Compare test output vs code semantically | High |
| Text comparison to requirements | Compare tests vs original plan docs | Medium |
| AI "Active listening" summaries | AI summaries of what tests actually test | Medium |
