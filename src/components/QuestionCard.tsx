import type { AssessmentQuestion } from "../domain/types";

interface QuestionCardProps {
  question: AssessmentQuestion;
  selectedOption?: string;
  onSelect: (optionId: string) => void;
}

export default function QuestionCard({ question, selectedOption, onSelect }: QuestionCardProps) {
  return (
    <section className="question-card" aria-labelledby={`${question.id}-prompt`}>
      <div className="question-card-meta"><span>{question.category}</span><span>行为情景题</span></div>
      <h2 id={`${question.id}-prompt`}>{question.prompt}</h2>
      <div className="answer-options" role="radiogroup" aria-label="答案选项">
        {question.options.map((option, index) => {
          const selected = selectedOption === option.id;
          return (
            <button
              className={`answer-option ${selected ? "is-selected" : ""}`}
              data-testid={`option-${index}`}
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
