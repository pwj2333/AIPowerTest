import type { AssessmentQuestion } from "../domain/types";

interface QuestionCardProps {
  question: AssessmentQuestion;
  selectedOption?: string;
  onSelect: (optionId: string) => void;
  seed: string;
}

export function stableOptionOrder(question: AssessmentQuestion, seed: string) {
  const ordered = [...question.options];
  let state = [...`${seed}:${question.id}`].reduce((total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0, 7);
  for (let index = ordered.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    [ordered[index], ordered[swapIndex]] = [ordered[swapIndex], ordered[index]];
  }
  const lastIndex = ordered.length - 1;
  if (ordered[lastIndex]?.score === 3) {
    const replacementIndex = state % lastIndex;
    [ordered[lastIndex], ordered[replacementIndex]] = [ordered[replacementIndex], ordered[lastIndex]];
  }
  return ordered;
}

export default function QuestionCard({ question, selectedOption, onSelect, seed }: QuestionCardProps) {
  const options = stableOptionOrder(question, seed);
  return (
    <section className="question-card" aria-labelledby={`${question.id}-prompt`}>
      <div className="question-card-meta"><span>{question.category}</span><span>行为情景题</span></div>
      <h2 id={`${question.id}-prompt`}>{question.prompt}</h2>
      <div className="answer-options" role="radiogroup" aria-label="答案选项">
        {options.map((option, index) => {
          const selected = selectedOption === option.id;
          return (
            <button
              className={`answer-option ${selected ? "is-selected" : ""}`}
              data-testid={`option-${option.score}`}
              key={option.id}
              onClick={() => onSelect(option.id)}
              role="radio"
              aria-checked={selected}
              type="button"
            >
              <span className="answer-letter">{String.fromCharCode(65 + index)}</span>
              <span>{option.label}</span>
              <span className="answer-check" aria-hidden="true">{selected ? "✓" : ""}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
