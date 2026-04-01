import './StepIndicator.css';

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

export default function StepIndicator({ steps, currentStep, onStepClick }) {
  return (
    <div className="step-indicator">
      {steps.map((label, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isFuture = index > currentStep;

        return (
          <div key={index} className="step-wrapper">
            {index > 0 && (
              <div className={`step-line ${isCompleted ? 'completed' : ''}`} />
            )}
            <button
              className={`step-circle ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isFuture ? 'future' : ''}`}
              onClick={() => isCompleted && onStepClick?.(index)}
              disabled={isFuture}
            >
              {isCompleted ? <CheckIcon /> : index + 1}
            </button>
            <span className={`step-label ${isCurrent ? 'current' : ''} ${isFuture ? 'future' : ''}`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
