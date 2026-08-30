import { use } from 'react';
import { PanelContext } from './PanelProvider';

export const usePanel = () => use(PanelContext);
