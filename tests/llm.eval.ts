import { evalite } from "evalite";

// Custom scorer for template format validation
function templateFormatScorer() {
  return {
    name: "TemplateFormat",
    scorer: (result: { output: string }) => {
      const output = result.output;

      if (!output || typeof output !== "string") {
        return {
          score: 0,
          reason: "Output is not a string",
        };
      }

      const lines = output.trim().split("\n");

      // Check if output has exactly 3 lines
      if (lines.length !== 3) {
        return {
          score: 0,
          reason: `Expected 3 lines, got ${lines.length}`,
        };
      }

      // Check first line starts with required phrase
      const line1 = lines[0]?.trim() ?? "";
      if (!line1.startsWith("Today will be a good day if:")) {
        return {
          score: 0,
          reason:
            "First line doesn't start with 'Today will be a good day if:'",
        };
      }

      // Check second line starts with required phrase
      const line2 = lines[1]?.trim() ?? "";
      if (!line2.startsWith("I will do this by:")) {
        return {
          score: 0,
          reason: "Second line doesn't start with 'I will do this by:'",
        };
      }

      // Check third line is exactly the required phrase
      const line3 = lines[2]?.trim() ?? "";
      if (line3 !== "Everything else can wait.") {
        return {
          score: 0,
          reason: "Third line should be 'Everything else can wait.'",
        };
      }

      return {
        score: 1,
        reason: "Output matches expected template format",
      };
    },
  };
}

// Custom scorer for checking key phrases are present
function containsKeyPhrasesScorer() {
  return {
    name: "ContainsKeyPhrases",
    scorer: (result: { output: string }) => {
      const output = result.output;

      if (!output || typeof output !== "string") {
        return {
          score: 0,
          reason: "Output is not a string",
        };
      }

      const requiredPhrases = [
        "Today will be a good day if:",
        "I will do this by:",
        "Everything else can wait.",
      ];

      const missing = requiredPhrases.filter(
        (phrase) => !output.includes(phrase)
      );

      if (missing.length > 0) {
        return {
          score: 0,
          reason: `Missing phrases: ${missing.join(", ")}`,
        };
      }

      return {
        score: 1,
        reason: "All required phrases present",
      };
    },
  };
}

evalite("LLM Output Format", {
  data: () => [
    {
      input: "I want to finish the project proposal",
    },
    {
      input: "Today I need to work on my fitness",
    },
    {
      input: "Learn something new about TypeScript",
    },
  ],
  task: (input) => {
    // Mock the LLM response for testing
    // In real usage, this would call the actual LLM via refineIntention()

    const inputStr = String(input || "");

    // Simulate a well-formatted response
    const output = [
      `Today will be a good day if: ${inputStr.toLowerCase()}`,
      "I will do this by: taking focused action on this goal",
      "Everything else can wait.",
    ].join("\n");

    return output;
  },
  scorers: [templateFormatScorer(), containsKeyPhrasesScorer()],
});

evalite("LLM Output Validation - Edge Cases", {
  data: () => [
    {
      input: "Multiple goals: finish report, attend meeting, review code",
    },
    {
      input: "Very vague: be productive",
    },
  ],
  task: (input) => {
    const inputStr = String(input || "");

    // Mock response for edge cases - focus on single goal
    if (inputStr.includes("Multiple goals")) {
      return [
        "Today will be a good day if: I complete the project report",
        "I will do this by: dedicating focused time to writing and reviewing",
        "Everything else can wait.",
      ].join("\n");
    }

    if (inputStr.includes("vague")) {
      return [
        "Today will be a good day if: I complete one meaningful task",
        "I will do this by: choosing a clear priority and focusing on it",
        "Everything else can wait.",
      ].join("\n");
    }

    // Default response
    return [
      `Today will be a good day if: ${inputStr}`,
      "I will do this by: taking action",
      "Everything else can wait.",
    ].join("\n");
  },
  scorers: [templateFormatScorer(), containsKeyPhrasesScorer()],
});

evalite("LLM Output - Invalid Formats", {
  data: () => [
    {
      input: "single-line-test",
    },
    {
      input: "missing-phrase-test",
    },
    {
      input: "extra-lines-test",
    },
  ],
  task: (input) => {
    const inputStr = String(input || "");

    // Intentionally return invalid formats to test scorer
    if (inputStr.includes("single-line")) {
      return "This is just a single line response";
    }

    if (inputStr.includes("missing-phrase")) {
      return [
        "Today will be good if: something",
        "I will do: something",
        "Everything can wait.",
      ].join("\n");
    }

    if (inputStr.includes("extra-lines")) {
      return [
        "Today will be a good day if: something",
        "I will do this by: something",
        "Everything else can wait.",
        "Extra line here",
      ].join("\n");
    }

    return "Invalid format";
  },
  scorers: [templateFormatScorer()],
});
