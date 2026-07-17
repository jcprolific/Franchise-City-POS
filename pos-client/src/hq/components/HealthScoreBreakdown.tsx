import { HEALTH_CATEGORY_LABELS, HEALTH_WEIGHTS, scoreColor, type BranchHealthScores } from '../lib/branchHealthService';

interface HealthScoreBreakdownProps {
  scores: BranchHealthScores;
  compact?: boolean;
}

export default function HealthScoreBreakdown({ scores, compact = false }: HealthScoreBreakdownProps) {
  const categories = Object.keys(HEALTH_WEIGHTS) as Array<keyof typeof HEALTH_WEIGHTS>;

  return (
    <div className={`health-breakdown${compact ? ' health-breakdown--compact' : ''}`}>
      {categories.map((key) => {
        const value = scores[key];
        const weight = HEALTH_WEIGHTS[key] * 100;
        return (
          <div key={key} className="health-breakdown-row">
            <div className="health-breakdown-label">
              <span>{HEALTH_CATEGORY_LABELS[key]}</span>
              <span className="health-breakdown-weight">{weight}%</span>
            </div>
            <div className="health-breakdown-bar-wrap">
              <div
                className="health-breakdown-bar"
                style={{ width: `${value}%`, backgroundColor: scoreColor(value) }}
              />
            </div>
            <span className="health-breakdown-value" style={{ color: scoreColor(value) }}>
              {Math.round(value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
