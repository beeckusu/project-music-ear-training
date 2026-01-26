import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import type { GameSession, NoteTrainingSessionResults } from '../types/game';
import './ProgressGraph.css';

interface ProgressGraphProps {
  /** Session history to display */
  sessions: GameSession[];
  /** Optional: specific chord to show progress for. If undefined, shows overall accuracy */
  chordName?: string;
  /** Optional: height of the chart in pixels */
  height?: number;
  /** Optional: title to display above the chart */
  title?: string;
}

interface DataPoint {
  sessionIndex: number;
  date: string;
  accuracy: number;
  chordsCompleted?: number;
}

/**
 * Formats a date for display on the chart axis.
 * Shows date in MM/DD format.
 */
const formatDate = (date: Date): string => {
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

/**
 * Formats relative time for tooltip display.
 */
const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

/**
 * Custom tooltip component for the chart.
 */
const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ value: number; payload: DataPoint }>;
  label?: string;
}> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  return (
    <div className="progress-tooltip">
      <p className="tooltip-date">{data.date}</p>
      <p className="tooltip-accuracy">Accuracy: {data.accuracy.toFixed(1)}%</p>
      {data.chordsCompleted !== undefined && (
        <p className="tooltip-chords">{data.chordsCompleted} chords</p>
      )}
    </div>
  );
};

/**
 * ProgressGraph component displays a line chart showing accuracy improvement over time.
 *
 * Features:
 * - Shows overall accuracy across sessions, or accuracy for a specific chord type
 * - Responsive design
 * - Custom tooltip with session details
 * - Trend indication via line color
 */
const ProgressGraph: React.FC<ProgressGraphProps> = ({
  sessions,
  chordName,
  height = 200,
  title
}) => {
  // Process session data into chart format
  const chartData = useMemo((): DataPoint[] => {
    // Filter to Note Training sessions with valid chordTypeStats data
    const noteTrainingSessions = sessions
      .filter(s => {
        const results = s.results as NoteTrainingSessionResults;
        // Must have chordTypeStats with at least one chord entry
        return results &&
          results.chordTypeStats &&
          typeof results.chordTypeStats === 'object' &&
          Object.keys(results.chordTypeStats).length > 0;
      })
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (chordName) {
      // Show accuracy for specific chord type over sessions
      return noteTrainingSessions
        .filter(s => {
          const results = s.results as NoteTrainingSessionResults;
          const chordStats = results.chordTypeStats[chordName];
          // Must have valid stats with attempts > 0
          return chordStats && chordStats.attempts > 0;
        })
        .map((session, index) => {
          const results = session.results as NoteTrainingSessionResults;
          const chordStats = results.chordTypeStats[chordName];
          return {
            sessionIndex: index + 1,
            date: formatRelativeTime(session.timestamp),
            accuracy: chordStats.accuracy,
            chordsCompleted: chordStats.attempts
          };
        });
    } else {
      // Show overall accuracy across all sessions
      // Filter out sessions without valid accuracy data
      return noteTrainingSessions
        .filter(s => {
          const results = s.results as NoteTrainingSessionResults;
          // Must have a valid accuracy value (use nullish check, 0 is valid)
          const accuracy = results.accuracy ?? s.accuracy;
          return typeof accuracy === 'number' && !isNaN(accuracy);
        })
        .map((session, index) => {
          const results = session.results as NoteTrainingSessionResults;
          return {
            sessionIndex: index + 1,
            date: formatRelativeTime(session.timestamp),
            // Use nullish coalescing so 0% is preserved (|| would treat 0 as falsy)
            accuracy: results.accuracy ?? session.accuracy,
            chordsCompleted: results.chordsCompleted
          };
        });
    }
  }, [sessions, chordName]);

  // Calculate trend (improvement direction)
  const trend = useMemo(() => {
    if (chartData.length < 2) return 'neutral';

    const recentHalf = chartData.slice(-Math.ceil(chartData.length / 2));
    const olderHalf = chartData.slice(0, Math.ceil(chartData.length / 2));

    const recentAvg = recentHalf.reduce((sum, d) => sum + d.accuracy, 0) / recentHalf.length;
    const olderAvg = olderHalf.reduce((sum, d) => sum + d.accuracy, 0) / olderHalf.length;

    const diff = recentAvg - olderAvg;
    if (diff > 5) return 'improving';
    if (diff < -5) return 'declining';
    return 'stable';
  }, [chartData]);

  // If no data, show empty state
  if (chartData.length === 0) {
    return (
      <div className="progress-graph-container">
        {title && <h4 className="progress-graph-title">{title}</h4>}
        <div className="progress-graph-empty">
          <p>No session data available yet.</p>
          <p className="progress-graph-hint">Complete more practice sessions to see your progress!</p>
        </div>
      </div>
    );
  }

  // If only one data point, show a simple stat instead
  if (chartData.length === 1) {
    return (
      <div className="progress-graph-container">
        {title && <h4 className="progress-graph-title">{title}</h4>}
        <div className="progress-graph-single">
          <p className="single-accuracy">{chartData[0].accuracy.toFixed(1)}%</p>
          <p className="single-label">First session recorded</p>
        </div>
      </div>
    );
  }

  const lineColor = trend === 'improving' ? '#4ade80' : trend === 'declining' ? '#f87171' : '#60a5fa';
  const trendLabel = trend === 'improving' ? '📈 Improving' : trend === 'declining' ? '📉 Needs work' : '➡️ Stable';

  return (
    <div className="progress-graph-container">
      {title && <h4 className="progress-graph-title">{title}</h4>}
      <div className="progress-graph-header">
        <span className={`trend-indicator trend-${trend}`}>{trendLabel}</span>
        <span className="session-count">{chartData.length} sessions</span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="sessionIndex"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            axisLine={{ stroke: '#4b5563' }}
            tickLine={{ stroke: '#4b5563' }}
            label={{ value: 'Session', position: 'bottom', fill: '#9ca3af', fontSize: 11 }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            axisLine={{ stroke: '#4b5563' }}
            tickLine={{ stroke: '#4b5563' }}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="accuracy"
            stroke={lineColor}
            strokeWidth={2}
            dot={{ fill: lineColor, strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, fill: lineColor, stroke: '#1f2937', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProgressGraph;
