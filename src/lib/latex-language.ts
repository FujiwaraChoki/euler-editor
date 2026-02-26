import type { languages } from "monaco-editor";

// Monarch tokenizer definitions adapted from koka-lang/madoko
// https://github.com/koka-lang/madoko/blob/master/styles/lang/latex.json

export const LATEX_BUILTINS = [
  "addcontentsline","addtocontents","addtocounter","address","addtolength","addvspace","alph","appendix",
  "arabic","author","backslash","baselineskip","baselinestretch","bf","bibitem","bigskipamount","bigskip",
  "boldmath","boldsymbol","cal","caption","cdots","centering","chapter","circle","cite","cleardoublepage",
  "clearpage","cline","closing","color","copyright","dashbox","date","ddots","documentclass","dotfill","em",
  "emph","ensuremath","epigraph","euro","fbox","flushbottom","fnsymbol","footnote","footnotemark",
  "footnotesize","footnotetext","frac","frame","framebox","frenchspacing","hfill","hline","href","hrulefill",
  "hspace","huge","Huge","hyphenation","include","includegraphics","includeonly","indent","input","it","item",
  "kill","label","large","Large","LARGE","LaTeX","LaTeXe","ldots","left","lefteqn","line","linebreak",
  "linethickness","linewidth","listoffigures","listoftables","location","makebox","maketitle","markboth",
  "mathcal","mathop","mbox","medskip","multicolumn","multiput","newcommand","newcolumntype","newcounter",
  "newenvironment","newfont","newlength","newline","newpage","newsavebox","newtheorem","nocite","noindent",
  "nolinebreak","nonfrenchspacing","normalsize","nopagebreak","not","onecolumn","opening","oval","overbrace",
  "overline","pagebreak","pagenumbering","pageref","pagestyle","par","paragraph","parbox","parindent","parskip",
  "part","protect","providecommand","put","raggedbottom","raggedleft","raggedright","raisebox","ref",
  "renewcommand","right","rm","roman","rule","savebox","sbox","sc","scriptsize","section","setcounter",
  "setlength","settowidth","sf","shortstack","signature","sl","slash","small","smallskip","sout","space","sqrt",
  "stackrel","stepcounter","subparagraph","subsection","subsubsection","tableofcontents","telephone","TeX",
  "textbf","textcolor","textit","textmd","textnormal","textrm","textsc","textsf","textsl","texttt","textup",
  "textwidth","textheight","thanks","thispagestyle","tiny","title","today","tt","twocolumn","typeout","typein",
  "uline","underbrace","underline","unitlength","usebox","usecounter","uwave","value","vbox","vcenter","vdots",
  "vector","verb","vfill","vline","vphantom","vspace",
  "RequirePackage","NeedsTeXFormat","usepackage","documentstyle",
  "def","edef","defcommand","if","ifdim","ifnum","ifx","fi","else","begingroup","endgroup",
  "definecolor","textcolor",
];

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
  builtin: LATEX_BUILTINS,

  tokenizer: {
    root: [
      // \begin{env} and \end{env}
      [/(\\begin)(\s*)(\{)([\w\-*@]+)(\})/, ["keyword.predefined", "white", "@brackets", { token: "tag", bracket: "@open" }, "@brackets"]],
      [/(\\end)(\s*)(\{)([\w\-*@]+)(\})/, ["keyword.predefined", "white", "@brackets", { token: "tag", bracket: "@close" }, "@brackets"]],

      // Special characters like \\ \{ \} etc.
      [/\\[^a-zA-Z@]/, "keyword"],

      // @ commands
      [/@[a-zA-Z@]+/, "keyword.at"],

      // LaTeX commands with builtin check
      [/\\([a-zA-Z@]+)/, { cases: { "$1@builtin": "keyword.predefined", "@default": "keyword" } }],

      { include: "@whitespace" },

      // Brackets
      [/[{}()\[\]]/, "@brackets"],

      // Argument numbers like #1, #2
      [/#+\d/, "number.arg"],

      // Numbers with units
      [/-?(?:\d+(?:\.\d+)?|\.\d+)\s*(?:em|ex|pt|pc|sp|cm|mm|in)/, "number.len"],
    ],

    whitespace: [
      [/[ \t\r\n]+/, "white"],
      [/%.*$/, "comment"],
    ],
  },
};
