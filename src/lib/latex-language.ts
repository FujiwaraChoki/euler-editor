import type { languages } from "monaco-editor";

export const latexLanguageConfig: languages.LanguageConfiguration = {
  comments: { lineComment: "%" },
  brackets: [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"],
  ],
  autoClosingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: "$", close: "$" },
  ],
  surroundingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: "$", close: "$" },
  ],
};

export const latexMonarchTokens: languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".latex",

  keywords: "\\\\(?:documentclass|usepackage|begin|end|section|subsection|subsubsection|paragraph|chapter|part|title|author|date|maketitle|tableofcontents|include|input|bibliography|newcommand|renewcommand|newenvironment|label|ref|cite|footnote|caption|textbf|textit|texttt|emph|underline|item|hline|toprule|midrule|bottomrule)",

  tokenizer: {
    root: [
      // Comments
      [/%.*$/, "comment"],

      // Display math $$...$$
      [/\$\$/, { token: "math.delimiter", next: "@displayMath" }],

      // Inline math $...$
      [/\$/, { token: "math.delimiter", next: "@inlineMath" }],

      // \[...\] display math
      [/\\\[/, { token: "math.delimiter", next: "@displayMathBracket" }],

      // \(...\) inline math
      [/\\\(/, { token: "math.delimiter", next: "@inlineMathParen" }],

      // \begin{env} and \end{env}
      [/\\(begin|end)\{/, { token: "keyword", next: "@environment" }],

      // Commands with keyword check
      [/\\[a-zA-Z@]+/, {
        cases: {
          "@keywords": "keyword",
          "@default": "command",
        },
      }],

      // Special characters
      [/\\[\\{}$&#%_^~]/, "command"],

      // Brackets
      [/[{}]/, "bracket"],
      [/[\[\]]/, "bracket"],

      // Numbers
      [/\d+(\.\d+)?/, "number"],
    ],

    displayMath: [
      [/\$\$/, { token: "math.delimiter", next: "@pop" }],
      [/\\[a-zA-Z@]+/, "command"],
      [/./, "math"],
    ],

    inlineMath: [
      [/\$/, { token: "math.delimiter", next: "@pop" }],
      [/\\[a-zA-Z@]+/, "command"],
      [/./, "math"],
    ],

    displayMathBracket: [
      [/\\\]/, { token: "math.delimiter", next: "@pop" }],
      [/\\[a-zA-Z@]+/, "command"],
      [/./, "math"],
    ],

    inlineMathParen: [
      [/\\\)/, { token: "math.delimiter", next: "@pop" }],
      [/\\[a-zA-Z@]+/, "command"],
      [/./, "math"],
    ],

    environment: [
      [/[a-zA-Z*]+/, "environment"],
      [/\}/, { token: "keyword", next: "@pop" }],
    ],
  },
};
