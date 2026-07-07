export default function StageBadge({ source }) {
  if (!source || source === 'skipped') return null;
  const isLive = source === 'live';
  return (
    <span className={`stage-badge ${isLive ? 'live' : 'simulated'}`}>
      {isLive ? 'Live' : 'Simulated'}
    </span>
  );
}
