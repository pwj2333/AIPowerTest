import { Award, Crown, Diamond, Gem, Medal, Shield, Sparkles, Target } from "lucide-react";
import type { Grade } from "../domain/types";

const icons = [Medal, Shield, Target, Gem, Diamond, Sparkles, Shield, Crown];

interface GradeBadgeProps {
  grade: Grade;
  compact?: boolean;
}

export default function GradeBadge({ grade, compact = false }: GradeBadgeProps) {
  const Icon = icons[grade.level - 1] ?? Award;
  return (
    <div className={`grade-badge ${compact ? "grade-badge-compact" : ""}`} style={{ "--grade-color": grade.color } as React.CSSProperties}>
      <div className="grade-badge-icon"><Icon size={compact ? 17 : 30} strokeWidth={1.7} /></div>
      <div>
        <span className="grade-badge-code">{grade.code}</span>
        <strong>{grade.name}</strong>
      </div>
    </div>
  );
}
