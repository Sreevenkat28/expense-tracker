import { answerQuestion, AssistantContext } from './assistant';

// The sentence parser lives in smartParser.ts; re-exported here so existing imports keep working
export { parseSmartTransaction } from './smartParser';
export type { ParsedSmartEntry } from './smartParser';

/**
 * AI Assistant: answers the question that was asked (see assistant.ts for how).
 * Every number is calculated from the real data, so nothing is made up.
 */
export function answerSpendingQuestion(question: string, context: AssistantContext): string {
  return answerQuestion(question, context);
}
