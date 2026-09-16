import type { AssistantTurn } from './types';
import { WELCOME_SUGGESTIONS } from './suggestions';

export function buildWelcomeTurn(): AssistantTurn {
  return {
    reply: '👋 أهلاً، أنا مساعد نحلة مول\n\nشو حابب تعرف أو تدور عليه؟',
    suggestions: WELCOME_SUGGESTIONS,
    suggestionContext: 'welcome',
  };
}
