import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { useBrand } from '../context/BrandContext';
import {
  fetchBranchHealthScores,
  getImprovementActions,
  scoreColor,
  scoreGrade,
  type BranchHealthScores,
  type HealthImprovementAction,
} from '../hq/lib/branchHealthService';
import '../hq/pages/BranchHealthPage.css';

interface PortalHealthWidgetProps {
  branchId: string | null;
}

export default function PortalHealthWidget({ branchId }: PortalHealthWidgetProps) {
  const { brand } = useBrand();
  const [scores, setScores] = useState<BranchHealthScores | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!branchId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await fetchBranchHealthScores(brand.dbBrandId);
      const mine = rows.find((r) => r.branchId === branchId);
      setScores(mine?.scores ?? null);
    } catch {
      setScores(null);
    } finally {
      setLoading(false);
    }
  }, [brand.dbBrandId, branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!branchId || loading) return null;
  if (!scores) return null;

  const actions = getImprovementActions(scores);

  return (
    <section className="portal-health-card" aria-label="Branch health score">
      <div className="portal-health-card-header">
        <div>
          <span className="portal-hub-badge">
            <Activity size={12} aria-hidden="true" />
            Branch Health Score
          </span>
          <p style={{ marginTop: 8, fontSize: '0.84rem', color: '#4f5a48' }}>
            {scoreGrade(scores.composite)} — improve these areas to raise your score.
          </p>
        </div>
        <div className="portal-health-score-ring">
          <span className="portal-health-score-value" style={{ color: scoreColor(scores.composite) }}>
            {Math.round(scores.composite)}
          </span>
          <span className="portal-health-score-label">Overall</span>
        </div>
      </div>

      {actions.length > 0 ? (
        <div className="portal-health-actions">
          {actions.map((action: HealthImprovementAction) => {
            const inner = (
              <>
                <span className="portal-health-action-num">{action.priority}</span>
                <div>
                  <strong>{action.label}</strong>
                  <span>{action.detail}</span>
                </div>
              </>
            );
            return action.href ? (
              <Link key={action.category} to={action.href} className="portal-health-action portal-health-action--link">
                {inner}
              </Link>
            ) : (
              <div key={action.category} className="portal-health-action">
                {inner}
              </div>
            );
          })}
        </div>
      ) : (
        <p style={{ fontSize: '0.82rem', color: '#008d36' }}>
          Great work — all categories are performing well this month.
        </p>
      )}
    </section>
  );
}
