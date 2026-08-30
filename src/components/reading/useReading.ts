import { use } from 'react';
import { ReadingContext } from './ReadingProvider';

export const useReading = () => use(ReadingContext);
