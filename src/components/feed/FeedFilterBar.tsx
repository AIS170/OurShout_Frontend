import React from 'react';
import { FeedFilter, FeedSort, PrincipleDto, TeamDto } from './feedTypes';

interface FeedFilterBarProps {
  filter: FeedFilter;
  principles: PrincipleDto[];
  teams: TeamDto[];
  onChange: (filter: FeedFilter) => void;
}

/** The newsfeed's filter bar: principle, team (any recipient in that team) and sort order. */
export const FeedFilterBar: React.FC<FeedFilterBarProps> = ({ filter, principles, teams, onChange }) => {
  return (
    <div className="os-filters" role="group" aria-label="Filter the newsfeed">
      <div className="os-field">
        <label className="os-label" htmlFor="feed-principle">
          Principle
        </label>
        <select
          id="feed-principle"
          className="os-select"
          value={filter.principleId ?? ''}
          onChange={(e) => onChange({ ...filter, principleId: e.target.value ? Number(e.target.value) : null })}
        >
          <option value="">All principles</option>
          {principles.map((principle) => (
            <option key={principle.id} value={principle.id}>
              {principle.name}
            </option>
          ))}
        </select>
      </div>

      <div className="os-field">
        <label className="os-label" htmlFor="feed-team">
          Team
        </label>
        <select
          id="feed-team"
          className="os-select"
          value={filter.teamId ?? ''}
          onChange={(e) => onChange({ ...filter, teamId: e.target.value || null })}
        >
          <option value="">All teams</option>
          {teams.map((team) => (
            <option key={team.teamId} value={team.teamId}>
              {team.teamName}
            </option>
          ))}
        </select>
      </div>

      <div className="os-field">
        <label className="os-label" htmlFor="feed-sort">
          Sort by
        </label>
        <select
          id="feed-sort"
          className="os-select"
          value={filter.sort}
          onChange={(e) => onChange({ ...filter, sort: e.target.value as FeedSort })}
        >
          <option value="newest">Newest</option>
          <option value="most_liked">Most liked</option>
        </select>
      </div>
    </div>
  );
};
