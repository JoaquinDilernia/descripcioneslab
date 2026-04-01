import './QualityBadge.css';

export default function QualityBadge({ score }) {
  let level = 'poor';
  if (score >= 70) level = 'good';
  else if (score >= 40) level = 'regular';

  return (
    <span className={`quality-badge ${level}`}>{score}</span>
  );
}
