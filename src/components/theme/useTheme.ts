import { use } from 'react';
import { ThemeContext } from './ThemeProvider';

export const useTheme = () => use(ThemeContext);
