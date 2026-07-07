import { themeClass, scoreStyle } from '../theme.js';

export default function RankedListItem({ rank, project, onClick }) {
  return (
    <div className={`ranked-item ${themeClass(project.theme)}`} onClick={() => onClick(project)}>
      <div className="rank-badge">#{rank}</div>
      <div style={{ flex: 1 }}>
        <span className={`theme-badge ${themeClass(project.theme)}`}>{project.theme}</span>
        <div className="title">{project.project_title}</div>
        <div className="rationale">{project.rationale}</div>
      </div>
      <div className="score-pill" style={scoreStyle(project.priority_score)}>
        {Math.round(project.priority_score)}
      </div>
    </div>
  );
}
