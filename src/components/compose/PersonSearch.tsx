import React, { useEffect, useId, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { EmployeeSummary } from '../feed/feedTypes';
import { MIN_SEARCH_LENGTH, searchDirectory } from './composeApi';

interface PersonSearchProps {
  label: string;
  /** People already chosen, so they aren't offered again. */
  excludeIds: string[];
  onPick: (person: EmployeeSummary) => void;
  /** Shown in red under the box and announced to screen readers. */
  error?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
}

/** How long to wait after the last keystroke before searching. */
const DEBOUNCE_MS = 250;

/**
 * Type-ahead search of the company directory. Results show the job title and team as well as the
 * name, so two people with the same name can be told apart. Works with the mouse or the keyboard
 * (arrow keys, Enter to pick, Escape to close) and follows the standard combobox pattern.
 */
export const PersonSearch: React.FC<PersonSearchProps> = ({ label, excludeIds, onPick, error, inputRef }) => {
  const id = useId();
  const listId = `${id}-list`;
  const statusId = `${id}-status`;
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<EmployeeSummary[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [failed, setFailed] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const closeTimer = useRef<number>();

  const trimmed = query.trim();
  const longEnough = trimmed.length >= MIN_SEARCH_LENGTH;

  useEffect(() => {
    if (!longEnough) {
      setResults([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    setFailed(false);
    const timer = window.setTimeout(() => {
      searchDirectory(trimmed, controller.signal)
        .then((people) => {
          setResults(people);
          setActiveIndex(-1);
          setSearching(false);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setResults([]);
          setFailed(true);
          setSearching(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, longEnough]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const options = results.filter((person) => !excludeIds.includes(person.employeeId));
  const showList = open && longEnough && options.length > 0;

  const pick = (person: EmployeeSummary) => {
    onPick(person);
    setQuery('');
    setResults([]);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && options.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index + 1) % options.length);
    } else if (event.key === 'ArrowUp' && options.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index <= 0 ? options.length - 1 : index - 1));
    } else if (event.key === 'Enter') {
      // Never submit the surrounding form from the search box.
      event.preventDefault();
      const chosen = options[activeIndex] ?? (options.length === 1 ? options[0] : undefined);
      if (showList && chosen) pick(chosen);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  let status = '';
  if (trimmed.length > 0 && !longEnough) status = `Type at least ${MIN_SEARCH_LENGTH} letters.`;
  else if (failed) status = "The search didn't work. Try again.";
  else if (searching) status = 'Searching...';
  else if (longEnough && options.length === 0) {
    status = 'No one found. Check the spelling, or they may already be on your list.';
  } else if (showList) status = `${options.length} ${options.length === 1 ? 'person' : 'people'} found.`;

  // Once the user starts typing, the live search status replaces the validation message.
  const shownError = trimmed.length === 0 ? error : undefined;

  return (
    <div className="os-field os-combo">
      <label className="os-label" htmlFor={id}>
        {label}
      </label>
      <div className="os-combo-box">
        <Search size={16} className="os-combo-icon" aria-hidden="true" />
        <input
          id={id}
          ref={inputRef}
          type="text"
          className="os-input os-combo-input"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
          aria-describedby={statusId}
          aria-invalid={Boolean(shownError)}
          autoComplete="off"
          placeholder="Start typing a name"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          // Wait a moment so a click on a result registers before the list closes.
          onBlur={() => {
            closeTimer.current = window.setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={handleKeyDown}
        />
        {showList && (
          <ul id={listId} className="os-combo-list" role="listbox" aria-label={label}>
            {options.map((person, index) => (
              <li
                key={person.employeeId}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className={index === activeIndex ? 'os-combo-option os-combo-option-active' : 'os-combo-option'}
                // Keep focus in the input when a result is clicked.
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => pick(person)}
              >
                <span className="os-combo-name">{person.name}</span>
                <span className="os-combo-detail">
                  {[person.jobTitle, person.teamName].filter(Boolean).join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p id={statusId} className={shownError ? 'os-hint os-field-error' : 'os-hint'} role="status">
        {shownError || status}
      </p>
    </div>
  );
};
