import React, { useEffect, useRef, useState } from 'react';
import { EmployeeSummary, TeamDto } from '../feed/feedTypes';
import { fetchTeamMembers } from './composeApi';

interface TeamPickerProps {
  teams: TeamDto[];
  teamId: string;
  onTeamChange: (teamId: string) => void;
  /** Reports the chosen team's members, so the page knows when the whole team is selected. */
  onMembersLoaded: (members: EmployeeSummary[]) => void;
  members: EmployeeSummary[];
  selectedIds: string[];
  /** Tick or untick one or more people. */
  onToggle: (people: EmployeeSummary[], selected: boolean) => void;
}

/**
 * Pick a team, then tick the people to recognise. "Select all members" ticks everyone at once,
 * and shows a dash when only some are ticked. Any name can be toggled on or off on its own.
 */
export const TeamPicker: React.FC<TeamPickerProps> = ({
  teams,
  teamId,
  onTeamChange,
  onMembersLoaded,
  members,
  selectedIds,
  onToggle,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [failed, setFailed] = useState<boolean>(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Kept in a ref so a new function from the parent doesn't fetch the members again.
  const membersLoadedRef = useRef(onMembersLoaded);
  membersLoadedRef.current = onMembersLoaded;

  useEffect(() => {
    if (!teamId) {
      membersLoadedRef.current([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    fetchTeamMembers(teamId, controller.signal)
      .then((people) => {
        membersLoadedRef.current(people);
        setLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        membersLoadedRef.current([]);
        setFailed(true);
        setLoading(false);
      });
    return () => controller.abort();
  }, [teamId]);

  const tickedCount = members.filter((person) => selectedIds.includes(person.employeeId)).length;
  const allTicked = members.length > 0 && tickedCount === members.length;
  const someTicked = tickedCount > 0 && !allTicked;

  // "Indeterminate" (the dash) can only be set from script.
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someTicked;
  }, [someTicked]);

  return (
    <div className="os-team-picker">
      <div className="os-field">
        <label className="os-label" htmlFor="compose-team">
          Pick a team
        </label>
        <select id="compose-team" className="os-select" value={teamId} onChange={(e) => onTeamChange(e.target.value)}>
          <option value="">Choose a team</option>
          {teams.map((team) => (
            <option key={team.teamId} value={team.teamId}>
              {team.teamName}
            </option>
          ))}
        </select>
      </div>

      {teamId && loading && (
        <p className="os-hint" role="status">
          Loading the team...
        </p>
      )}
      {teamId && failed && (
        <p className="os-hint os-field-error" role="alert">
          We couldn't load that team. Pick it again to retry.
        </p>
      )}
      {teamId && !loading && !failed && members.length === 0 && (
        <p className="os-hint" role="status">
          There's no one else in this team to recognise.
        </p>
      )}

      {members.length > 0 && !loading && (
        <fieldset className="os-members">
          <legend className="os-visually-hidden">Team members</legend>
          <label className="os-check os-check-all">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allTicked}
              onChange={(e) => onToggle(members, e.target.checked)}
            />
            <span>
              Select all members <span className="os-muted">({members.length})</span>
            </span>
          </label>
          <ul className="os-member-list">
            {members.map((person) => (
              <li key={person.employeeId}>
                <label className="os-check">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(person.employeeId)}
                    onChange={(e) => onToggle([person], e.target.checked)}
                  />
                  <span>
                    {person.name}
                    {person.jobTitle && <span className="os-muted"> · {person.jobTitle}</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
    </div>
  );
};
