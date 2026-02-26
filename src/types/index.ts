export interface CompileResult {
  success: boolean;
  pdf_base64: string | null;
  log: string;
  errors: string[];
}

export interface EulerConfig {
  compiler: string;
  auto_save: boolean;
  theme: string;
  ui_font: string;
  code_font: string;
  debounce_ms: number;
  vim_mode: boolean;
  relative_line_numbers: boolean;
  show_line_numbers: boolean;
}

export interface ThemeColors {
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  error: string;
  success: string;
  warning: string;
}

export interface Theme {
  name: string;
  displayName: string;
  colors: ThemeColors;
}
