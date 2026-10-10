import { useColorScheme } from 'react-native';

export type Palette = {
  dark: boolean;
  bg: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  danger: string;
  buttonBg: string;
  buttonText: string;
  inputBg: string;
};

export function usePalette(): Palette {
  const dark = useColorScheme() === 'dark';
  return {
    dark,
    bg: dark ? '#09090b' : '#fafafa',
    card: dark ? '#18181b' : '#ffffff',
    text: dark ? '#fafafa' : '#18181b',
    muted: dark ? '#a1a1aa' : '#71717a',
    border: dark ? '#3f3f46' : '#d4d4d8',
    danger: '#dc2626',
    buttonBg: dark ? '#fafafa' : '#18181b',
    buttonText: dark ? '#18181b' : '#ffffff',
    inputBg: dark ? '#09090b' : '#ffffff',
  };
}
