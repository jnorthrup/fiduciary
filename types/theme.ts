export type ThemeMode = 'light' | 'dark';

export interface ThemeTokens {
  colors: {
    bg: string;
    bgMuted: string;
    surface: string;
    surfaceAlt: string;
    text: string;
    textMuted: string;
    primary: string;
    primaryHover: string;
    accent: string;
    border: string;
    ring: string;
    success: string;
    warning: string;
    danger: string;
  };
  typography: {
    fontSans: string;
    fontMono: string;
  };
  radius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  shadow: {
    sm: string;
    md: string;
    lg: string;
  };
}
