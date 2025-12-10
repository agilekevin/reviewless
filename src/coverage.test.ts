import { describe, it, expect } from "vitest";
import { extractImportsFromPatch, sourceMatchesImport } from "./coverage.js";

describe("extractImportsFromPatch", () => {
  describe("Python imports", () => {
    it("extracts 'from X import Y' style imports", () => {
      const patch = `
+from langgraph.graph import StateGraph
+from langgraph.pregel import Channel
`;
      const imports = extractImportsFromPatch(patch, "tests/test_graph.py");
      expect(imports).toContain("langgraph.graph");
      expect(imports).toContain("langgraph.pregel");
    });

    it("extracts 'import X' style imports", () => {
      const patch = `
+import langgraph.types
+import json
`;
      const imports = extractImportsFromPatch(patch, "tests/test_types.py");
      expect(imports).toContain("langgraph.types");
      expect(imports).toContain("json");
    });

    it("ignores removed lines", () => {
      const patch = `
-from old_module import OldClass
+from new_module import NewClass
`;
      const imports = extractImportsFromPatch(patch, "tests/test_foo.py");
      expect(imports).not.toContain("old_module");
      expect(imports).toContain("new_module");
    });

    it("handles nested module paths", () => {
      const patch = `
+from langgraph._internal._pregel import Something
`;
      const imports = extractImportsFromPatch(patch, "tests/test_pregel.py");
      expect(imports).toContain("langgraph._internal._pregel");
    });
  });

  describe("JavaScript/TypeScript imports", () => {
    it("extracts ES module imports", () => {
      const patch = `
+import { foo } from "./utils";
+import bar from "../lib/bar";
`;
      const imports = extractImportsFromPatch(patch, "src/__tests__/foo.test.ts");
      expect(imports).toContain("./utils");
      expect(imports).toContain("../lib/bar");
    });

    it("extracts require calls", () => {
      const patch = `
+const utils = require("./utils");
+const path = require('path');
`;
      const imports = extractImportsFromPatch(patch, "src/__tests__/foo.test.js");
      expect(imports).toContain("./utils");
      expect(imports).toContain("path");
    });
  });

  describe("Go imports", () => {
    it("extracts Go import statements", () => {
      const patch = `
+import "github.com/foo/bar"
+	"github.com/baz/qux"
`;
      const imports = extractImportsFromPatch(patch, "foo_test.go");
      expect(imports).toContain("github.com/foo/bar");
      expect(imports).toContain("github.com/baz/qux");
    });
  });

  it("returns empty array for empty patch", () => {
    expect(extractImportsFromPatch("", "test.py")).toEqual([]);
  });

  it("deduplicates imports", () => {
    const patch = `
+from foo import bar
+from foo import baz
`;
    const imports = extractImportsFromPatch(patch, "test.py");
    const fooCount = imports.filter((i) => i === "foo").length;
    expect(fooCount).toBe(1);
  });
});

describe("sourceMatchesImport", () => {
  describe("Python module matching", () => {
    it("matches full module path", () => {
      expect(
        sourceMatchesImport(
          "libs/langgraph/langgraph/graph/state.py",
          ["langgraph.graph.state"]
        )
      ).toBe(true);
    });

    it("matches partial module path (prefix)", () => {
      expect(
        sourceMatchesImport(
          "libs/langgraph/langgraph/graph/state.py",
          ["langgraph.graph"]
        )
      ).toBe(true);
    });

    it("matches base filename", () => {
      expect(
        sourceMatchesImport(
          "libs/langgraph/langgraph/graph/state.py",
          ["state"]
        )
      ).toBe(true);
    });

    it("matches internal module paths", () => {
      expect(
        sourceMatchesImport(
          "libs/langgraph/langgraph/_internal/_pregel.py",
          ["langgraph._internal._pregel"]
        )
      ).toBe(true);
    });

    it("does not match unrelated modules", () => {
      expect(
        sourceMatchesImport(
          "libs/langgraph/langgraph/graph/state.py",
          ["langgraph.types", "langgraph.errors"]
        )
      ).toBe(false);
    });
  });

  describe("JavaScript/TypeScript path matching", () => {
    it("matches relative imports converted to module paths", () => {
      expect(
        sourceMatchesImport(
          "src/utils/helpers.ts",
          ["utils.helpers"]
        )
      ).toBe(true);
    });

    it("matches base filename for JS files", () => {
      expect(
        sourceMatchesImport(
          "src/components/Button.tsx",
          ["Button"]
        )
      ).toBe(true);
    });
  });

  it("returns false for empty imports array", () => {
    expect(sourceMatchesImport("src/foo.py", [])).toBe(false);
  });

  it("handles files without directory", () => {
    expect(sourceMatchesImport("foo.py", ["foo"])).toBe(true);
  });

  it("handles files without extension", () => {
    expect(sourceMatchesImport("src/Makefile", ["Makefile"])).toBe(true);
  });
});
