import type { languages, editor, IRange } from "monaco-editor";
import { LATEX_BUILTINS } from "./latex-language";

type Monaco = typeof import("monaco-editor");

interface SnippetDef {
  label: string;
  insertText: string;
  detail: string;
  kind: "snippet" | "function";
}

const ENV_SNIPPETS: SnippetDef[] = [
  {
    label: "begin",
    insertText: "\\begin{${1:environment}}\n\t$0\n\\end{${1:environment}}",
    detail: "Generic environment",
    kind: "snippet",
  },
  {
    label: "figure",
    insertText:
      "\\begin{figure}[${1:htbp}]\n\t\\centering\n\t\\includegraphics[width=${2:0.8}\\textwidth]{${3:filename}}\n\t\\caption{${4:Caption}}\n\t\\label{fig:${5:label}}\n\\end{figure}",
    detail: "Figure environment",
    kind: "snippet",
  },
  {
    label: "table",
    insertText:
      "\\begin{table}[${1:htbp}]\n\t\\centering\n\t\\caption{${2:Caption}}\n\t\\label{tab:${3:label}}\n\t\\begin{tabular}{${4:cc}}\n\t\t\\hline\n\t\t$0\n\t\t\\hline\n\t\\end{tabular}\n\\end{table}",
    detail: "Table environment",
    kind: "snippet",
  },
  {
    label: "itemize",
    insertText: "\\begin{itemize}\n\t\\item $0\n\\end{itemize}",
    detail: "Bulleted list",
    kind: "snippet",
  },
  {
    label: "enumerate",
    insertText: "\\begin{enumerate}\n\t\\item $0\n\\end{enumerate}",
    detail: "Numbered list",
    kind: "snippet",
  },
  {
    label: "description",
    insertText:
      "\\begin{description}\n\t\\item[${1:term}] $0\n\\end{description}",
    detail: "Description list",
    kind: "snippet",
  },
  {
    label: "equation",
    insertText: "\\begin{equation}\n\t${1:expression}\n\t\\label{eq:${2:label}}\n\\end{equation}",
    detail: "Numbered equation",
    kind: "snippet",
  },
  {
    label: "equation*",
    insertText: "\\begin{equation*}\n\t$0\n\\end{equation*}",
    detail: "Unnumbered equation",
    kind: "snippet",
  },
  {
    label: "align",
    insertText: "\\begin{align}\n\t${1:lhs} &= ${2:rhs} \\\\\\\\\n\t$0\n\\end{align}",
    detail: "Aligned equations",
    kind: "snippet",
  },
  {
    label: "align*",
    insertText: "\\begin{align*}\n\t${1:lhs} &= ${2:rhs} \\\\\\\\\n\t$0\n\\end{align*}",
    detail: "Aligned equations (unnumbered)",
    kind: "snippet",
  },
  {
    label: "tabular",
    insertText:
      "\\begin{tabular}{${1:cc}}\n\t\\hline\n\t$0\n\t\\hline\n\\end{tabular}",
    detail: "Tabular environment",
    kind: "snippet",
  },
  {
    label: "abstract",
    insertText: "\\begin{abstract}\n\t$0\n\\end{abstract}",
    detail: "Abstract environment",
    kind: "snippet",
  },
  {
    label: "minipage",
    insertText:
      "\\begin{minipage}{${1:0.5}\\textwidth}\n\t$0\n\\end{minipage}",
    detail: "Minipage environment",
    kind: "snippet",
  },
  {
    label: "tikzpicture",
    insertText: "\\begin{tikzpicture}\n\t$0\n\\end{tikzpicture}",
    detail: "TikZ picture",
    kind: "snippet",
  },
  {
    label: "verbatim",
    insertText: "\\begin{verbatim}\n$0\n\\end{verbatim}",
    detail: "Verbatim environment",
    kind: "snippet",
  },
  {
    label: "center",
    insertText: "\\begin{center}\n\t$0\n\\end{center}",
    detail: "Center environment",
    kind: "snippet",
  },
  {
    label: "quote",
    insertText: "\\begin{quote}\n\t$0\n\\end{quote}",
    detail: "Quote environment",
    kind: "snippet",
  },
  {
    label: "frame",
    insertText:
      "\\begin{frame}{${1:Title}}\n\t$0\n\\end{frame}",
    detail: "Beamer frame",
    kind: "snippet",
  },
  {
    label: "columns",
    insertText:
      "\\begin{columns}\n\t\\begin{column}{${1:0.5}\\textwidth}\n\t\t$0\n\t\\end{column}\n\t\\begin{column}{${2:0.5}\\textwidth}\n\t\t\n\t\\end{column}\n\\end{columns}",
    detail: "Beamer columns",
    kind: "snippet",
  },
  {
    label: "cases",
    insertText:
      "\\begin{cases}\n\t${1:expression} & \\text{if } ${2:condition} \\\\\\\\\n\t${3:expression} & \\text{otherwise}\n\\end{cases}",
    detail: "Cases environment",
    kind: "snippet",
  },
  {
    label: "matrix",
    insertText: "\\begin{${1|pmatrix,bmatrix,vmatrix,Vmatrix,matrix|}}\n\t$0\n\\end{${1|pmatrix,bmatrix,vmatrix,Vmatrix,matrix|}}",
    detail: "Matrix environment",
    kind: "snippet",
  },
];

const COMMAND_SNIPPETS: SnippetDef[] = [
  {
    label: "new",
    insertText:
      "\\documentclass[${1:12pt}]{${2:article}}\n\n\\usepackage[utf8]{inputenc}\n\\usepackage{${3:amsmath}}\n\n\\title{${4:Title}}\n\\author{${5:Author}}\n\\date{${6:\\\\today}}\n\n\\begin{document}\n\n\\maketitle\n\n$0\n\n\\end{document}",
    detail: "New LaTeX document",
    kind: "snippet",
  },
  {
    label: "frac",
    insertText: "\\frac{${1:num}}{${2:den}}",
    detail: "Fraction",
    kind: "snippet",
  },
  {
    label: "dfrac",
    insertText: "\\dfrac{${1:num}}{${2:den}}",
    detail: "Display fraction",
    kind: "snippet",
  },
  {
    label: "sqrt",
    insertText: "\\sqrt{${1:expression}}",
    detail: "Square root",
    kind: "snippet",
  },
  {
    label: "href",
    insertText: "\\href{${1:url}}{${2:text}}",
    detail: "Hyperlink",
    kind: "snippet",
  },
  {
    label: "includegraphics",
    insertText:
      "\\includegraphics[${1:width=\\\\textwidth}]{${2:filename}}",
    detail: "Include image",
    kind: "snippet",
  },
  {
    label: "newcommand",
    insertText: "\\newcommand{\\\\${1:name}}[${2:0}]{${3:definition}}",
    detail: "New command definition",
    kind: "snippet",
  },
  {
    label: "renewcommand",
    insertText: "\\renewcommand{\\\\${1:name}}[${2:0}]{${3:definition}}",
    detail: "Renew command definition",
    kind: "snippet",
  },
  {
    label: "usepackage",
    insertText: "\\usepackage[${1:options}]{${2:package}}",
    detail: "Use package",
    kind: "snippet",
  },
  {
    label: "documentclass",
    insertText: "\\documentclass[${1:options}]{${2:class}}",
    detail: "Document class",
    kind: "snippet",
  },
  {
    label: "textbf",
    insertText: "\\textbf{${1:text}}",
    detail: "Bold text",
    kind: "snippet",
  },
  {
    label: "textit",
    insertText: "\\textit{${1:text}}",
    detail: "Italic text",
    kind: "snippet",
  },
  {
    label: "texttt",
    insertText: "\\texttt{${1:text}}",
    detail: "Monospace text",
    kind: "snippet",
  },
  {
    label: "underline",
    insertText: "\\underline{${1:text}}",
    detail: "Underlined text",
    kind: "snippet",
  },
  {
    label: "emph",
    insertText: "\\emph{${1:text}}",
    detail: "Emphasized text",
    kind: "snippet",
  },
  {
    label: "section",
    insertText: "\\section{${1:Title}}",
    detail: "Section heading",
    kind: "snippet",
  },
  {
    label: "subsection",
    insertText: "\\subsection{${1:Title}}",
    detail: "Subsection heading",
    kind: "snippet",
  },
  {
    label: "subsubsection",
    insertText: "\\subsubsection{${1:Title}}",
    detail: "Subsubsection heading",
    kind: "snippet",
  },
  {
    label: "chapter",
    insertText: "\\chapter{${1:Title}}",
    detail: "Chapter heading",
    kind: "snippet",
  },
  {
    label: "cite",
    insertText: "\\cite{${1:key}}",
    detail: "Citation",
    kind: "snippet",
  },
  {
    label: "ref",
    insertText: "\\ref{${1:label}}",
    detail: "Reference",
    kind: "snippet",
  },
  {
    label: "label",
    insertText: "\\label{${1:label}}",
    detail: "Label",
    kind: "snippet",
  },
  {
    label: "footnote",
    insertText: "\\footnote{${1:text}}",
    detail: "Footnote",
    kind: "snippet",
  },
  {
    label: "sum",
    insertText: "\\sum_{${1:i=1}}^{${2:n}} ${0:expression}",
    detail: "Summation",
    kind: "snippet",
  },
  {
    label: "int",
    insertText: "\\int_{${1:a}}^{${2:b}} ${3:f(x)} \\, d${4:x}",
    detail: "Integral",
    kind: "snippet",
  },
  {
    label: "lim",
    insertText: "\\lim_{${1:x} \\to ${2:\\\\infty}} ${0:expression}",
    detail: "Limit",
    kind: "snippet",
  },
];

// Collect all snippet labels to avoid duplicating them as plain completions
const snippetLabels = new Set([
  ...ENV_SNIPPETS.map((s) => s.label),
  ...COMMAND_SNIPPETS.map((s) => s.label),
]);

export function registerLatexCompletionProvider(monaco: Monaco): void {
  monaco.languages.registerCompletionItemProvider("latex", {
    triggerCharacters: ["\\"],
    provideCompletionItems(
      model: editor.ITextModel,
      position: { lineNumber: number; column: number },
    ): languages.ProviderResult<languages.CompletionList> {
      const textUntilPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      // Find the start of the current command (after \)
      const backslashIndex = textUntilPosition.lastIndexOf("\\");
      if (backslashIndex === -1) {
        return { suggestions: [] };
      }

      const range: IRange = {
        startLineNumber: position.lineNumber,
        startColumn: backslashIndex + 1, // include the backslash
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      };

      const suggestions: languages.CompletionItem[] = [];
      let sortOrder = 0;

      // Environment snippets (highest priority)
      for (const snippet of ENV_SNIPPETS) {
        suggestions.push({
          label: snippet.label,
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: snippet.insertText,
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: snippet.detail,
          documentation: `Environment: ${snippet.label}`,
          range,
          sortText: `0_${String(sortOrder++).padStart(3, "0")}`,
        });
      }

      // Command snippets (high priority)
      for (const snippet of COMMAND_SNIPPETS) {
        suggestions.push({
          label: `\\${snippet.label}`,
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: snippet.insertText,
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: snippet.detail,
          documentation: snippet.detail,
          range,
          sortText: `1_${String(sortOrder++).padStart(3, "0")}`,
        });
      }

      // Built-in command completions (lower priority)
      for (const cmd of LATEX_BUILTINS) {
        if (snippetLabels.has(cmd)) continue;
        suggestions.push({
          label: `\\${cmd}`,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: `\\${cmd}`,
          detail: "LaTeX command",
          range,
          sortText: `2_${cmd}`,
        });
      }

      return { suggestions };
    },
  });
}
