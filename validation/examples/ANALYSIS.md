# False Positive Analysis

## Overview

False positives occur when our scoring flags a commit as high-risk, but it wasn't in the labeled
"bug-introducing" dataset. Note: this doesn't mean the commit is actually bug-free - just that
we don't have evidence it introduced a bug.

## False Positive 1: json-path/JsonPath (Score: 45)

**Commit**: b6c60b3 - "Prepare next version (#1059)"
**Files**: README.md, build.gradle (2 files)
**Changes**: 263 lines (143 added, 120 deleted)

### Why we flagged it:
- Large change size (263 lines) triggers size-based risk
- README.md had 263 changes - our complexity heuristics triggered

### Why it's probably fine:
- This is purely a version bump commit (2.9.0 → 2.10.0)
- Only touches documentation and build config
- No actual source code changes

### Takeaway:
**Documentation-only commits are false positives.** We should consider:
- Reducing scores for .md files
- Recognizing "version bump" patterns


## False Positive 2: flyway/flyway (Score: 37.5)

**Commit**: 81bd9f8 - "Bump version to flyway-11.19.0"
**Files**: 86 files (documentation, pom.xml, assembly files, etc.)
**Changes**: Mix of docs, config, and new feature code

### Why we flagged it:
- 86 files touched - large commit
- New Java file added (StandardInEnvironmentModelProvider.java)
- Changes to shell scripts (flyway, flyway.cmd)
- pom.xml changes

### Why it might actually be risky:
- This is a release prep commit with actual code changes
- New provider class could have bugs
- Shell script changes affect CLI behavior
- **This might actually BE a true positive that wasn't labeled**

### Takeaway:
Release commits are hard to judge - they combine innocuous version bumps with real changes.


## True Positive 1: apache/incubator-dubbo (Score: 72.5)

**Commit**: 95ebfe8 - "add java doc to dubbo-config-api (#3103)"
**Files**: 21 Java config files
**Changes**: Javadoc additions across config classes

### Why we flagged it:
- 21 files modified (high file count)
- All core config classes touched
- Changes to AbstractConfig, ApplicationConfig, etc.

### Actual bug:
This commit, despite being "just javadoc", introduced a bug. Possible reasons:
- Accidental code changes alongside docs
- Copy-paste errors in doc strings affecting parsing
- Changes to static blocks during "cleanup"

### Takeaway:
**Large multi-file commits deserve scrutiny even when they seem benign.**


## Summary: Why False Positives Happen

1. **Documentation commits**: README changes, version bumps, doc improvements
   - These inflate line counts without actual risk
   - Suggestion: weight .md/.txt/.html files lower

2. **Release/deployment commits**: Version bumps, changelog updates
   - Often mix innocuous changes with real code
   - Hard to distinguish automatically

3. **Config-only changes**: pom.xml, package.json, build.gradle
   - Dependency updates look risky (security patterns match) but often aren't
   - Already filtering lock files; could extend to more config patterns

4. **The baseline problem**: Our "clean" commits are random - some probably ARE buggy
   - False positives may actually be true positives without labels


## Recommendations

1. **Reduce weight for documentation files** (.md, .rst, .txt, .html in /docs)
2. **Add "version bump" detection** to reduce scores for release commits
3. **Consider file path patterns**: /docs/, /documentation/ folders are lower risk
4. **Accept some false positives**: High precision at threshold 40+ (73-83%) is good
