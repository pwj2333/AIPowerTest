import type { StoredResult } from "../domain/store";
import { getGrade } from "../domain/questions";

export default function LevelDistribution({ results }: { results: StoredResult[] }) {
  const counts = Array.from({ length: 8 }, (_, index) => results.filter(({ result }) => result.level === index + 1).length);
  const max = Math.max(...counts, 1);
  return <div className="level-distribution">{counts.map((count, index) => { const grade = getGrade(index + 1); return <div className="distribution-row" key={grade.code}><span className="distribution-label">{grade.code}</span><div className="distribution-track"><span style={{ width: `${(count / max) * 100}%`, background: grade.color }} /></div><strong>{count}</strong></div>; })}</div>;
}
