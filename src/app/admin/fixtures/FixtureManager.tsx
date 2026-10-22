"use client";

import { startTransition, useActionState, useMemo, useState, type FormEvent } from "react";
import type { Fixture, FixtureSaveState } from "@/types/fixtures";
import { saveFixture, saveFixtureBatch, saveFixtureSeries } from "./actions";
import ImageField from "@/app/admin/ImageField";
import { looksFinished } from "@/lib/fixtures/live-clock";
import { EXPECTED_UPDATED_AT_FIELD } from "@/lib/admin/concurrency";
import {
  VENUE_TYPES,
  MATCH_STATUSES,
  matchCompetition,
  type Competition,
} from "@/lib/reference-data";
import { parseBulkFixtures, MAX_BULK_LINES } from "@/lib/fixtures/bulk-paste";
import { generateSeriesDates, weekdayName, MAX_SERIES_LENGTH, MAX_SERIES_INTERVAL_WEEKS } from "@/lib/fixtures/recurrence";
import { findBatchDuplicates } from "@/lib/fixtures/duplicates";
import styles from "./Admin.module.css";

const initial: FixtureSaveState = { status: "idle", message: "" };

/**
 * A fixtures save action wired for the duplicate warning.
 *
 * Submits through onSubmit rather than the form's action prop, because React
 * resets a form after an action-prop submission: the duplicate warning's "Save
 * anyway" would then resubmit an emptied form. The submitter is passed to
 * FormData so that button's confirm_duplicate value travels with the fields.
 */
function useFixtureAction(action: (previous: FixtureSaveState, formData: FormData) => Promise<FixtureSaveState>) {
  const [state, dispatch, pending] = useActionState(action, initial);
  const [dismissed, setDismissed] = useState<FixtureSaveState | null>(null);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => dispatch(formData));
  }
  const warning = state.status === "duplicate" && dismissed !== state ? state : null;
  return { state, pending, onSubmit, warning, cancel: () => setDismissed(state) };
}

function ActionMessage({ state }: { state: FixtureSaveState }) {
  if (!state.message || state.status === "duplicate") return null;
  return <p className={state.status === "error" ? styles.error : styles.feedback} role={state.status === "error" ? "alert" : "status"}>{state.message}</p>;
}

function DuplicateWarning({ warning, pending, onCancel }: { warning: FixtureSaveState; pending: boolean; onCancel: () => void }) {
  return <div className={styles.warning} role="alert">
    <p>{warning.message}</p>
    {warning.duplicates && warning.duplicates.length > 0 && <ul>
      {warning.duplicates.map((fixture) => <li key={fixture.id}>{fixture.match_date} · {fixture.opponent} · {fixture.competition}</li>)}
    </ul>}
    <div className={styles.warningActions}>
      <button type="submit" name="confirm_duplicate" value="1" disabled={pending}>{pending ? "Saving…" : "Save anyway"}</button>
      <button type="button" className={styles.secondaryButton} onClick={onCancel}>Cancel</button>
    </div>
  </div>;
}

function FixtureForm({
  fixture,
  title,
  competitions,
}: {
  fixture?: Fixture;
  title: string;
  competitions: Competition[];
}) {
  const { state, pending, onSubmit, warning, cancel } = useFixtureAction(saveFixture);
  return <form onSubmit={onSubmit} className={styles.form}>
    {fixture && <input type="hidden" name="id" value={fixture.id} />}
    {fixture && <input type="hidden" name={EXPECTED_UPDATED_AT_FIELD} value={fixture.updated_at} />}
    <h3>{title}</h3>
    <div className={styles.fields}>
      <label>Opponent<input name="opponent" required maxLength={100} defaultValue={fixture?.opponent} /></label>
      <label>
        Competition
        <CompetitionSelect
          competitions={competitions}
          stored={fixture?.competition}
          inputName="competition"
        />
      </label>
      <label>Season<input name="season" required maxLength={30} placeholder="2026–27" defaultValue={fixture?.season} /></label>
      <label>Match date<input name="match_date" type="date" required defaultValue={fixture?.match_date} /></label>
      <label>Kickoff time<input name="kickoff_time" type="time" defaultValue={fixture?.kickoff_time?.slice(0, 5) ?? ""} /></label>
      <label>Venue<input name="venue" maxLength={160} defaultValue={fixture?.venue ?? ""} /></label>
      <label>Venue type<select name="venue_type" defaultValue={fixture?.venue_type ?? "home"}>{VENUE_TYPES.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select></label>
      <label>Match status<select name="status" defaultValue={fixture?.status ?? "scheduled"}>{MATCH_STATUSES.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select></label>
      <label>Shaita goals<input name="shaita_goals" type="number" min="0" max="99" defaultValue={fixture?.shaita_goals ?? ""} /></label>
      <label>Opponent goals<input name="opponent_goals" type="number" min="0" max="99" defaultValue={fixture?.opponent_goals ?? ""} /></label>
      <div className={styles.fullWidth}>
        <ImageField
          name="opponent_logo_url"
          altName="opponent_logo_alt"
          label="Opponent logo"
          purpose="opponent"
          defaultValue={fixture?.opponent_logo_url ?? null}
          defaultAlt={fixture?.opponent_logo_alt ?? null}
          hint="Optional. Without one, the match card shows the opponent's initials."
        />
      </div>
      <label className={styles.fullWidth}>Notes<textarea name="notes" rows={3} maxLength={2000} defaultValue={fixture?.notes ?? ""} /></label>
      <label className={styles.checkbox}><input name="is_published" type="checkbox" defaultChecked={fixture?.is_published ?? true} /> Published on the public website</label>
      <label className={styles.checkbox}><input name="alerts_muted" type="checkbox" defaultChecked={fixture?.alerts_muted ?? false} /> Mute match alerts for this fixture (no kick-off, goal or result notifications)</label>
    </div>
    <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save fixture"}</button>
    {warning && <DuplicateWarning warning={warning} pending={pending} onCancel={cancel} />}
    <ActionMessage state={state} />
  </form>;
}

function toExisting(fixtures: Fixture[]) {
  return fixtures.map(({ id, opponent, competition, match_date }) => ({ id, opponent, competition, match_date }));
}

/**
 * Bulk paste. The preview is parsed in the browser as the admin types, with the
 * same parser the save action runs again on the server, so what the preview
 * accepts is what gets saved.
 */
function BulkPasteForm({ fixtures, competitions }: { fixtures: Fixture[]; competitions: Competition[] }) {
  const { state, pending, onSubmit, warning, cancel } = useFixtureAction(saveFixtureBatch);
  const [lines, setLines] = useState("");
  const [season, setSeason] = useState("");
  const [competition, setCompetition] = useState(competitions[0]?.name ?? "");
  const [venueType, setVenueType] = useState("home");

  const parsed = useMemo(
    () => parseBulkFixtures(lines, { season, competition, venue_type: venueType }, competitions),
    [lines, season, competition, venueType, competitions],
  );
  const duplicates = useMemo(() => {
    const valid = parsed.flatMap((line) => (line.input ? [{ line: line.line, input: line.input }] : []));
    const results = findBatchDuplicates(valid.map((entry) => entry.input), toExisting(fixtures));
    const byLine = new Map<number, string>();
    results.forEach((result, index) => {
      const { line } = valid[index];
      if (result.existing.length) byLine.set(line, `Possible duplicate of ${result.existing.map((fixture) => `${fixture.opponent} on ${fixture.match_date}`).join(", ")}`);
      else if (result.earlier.length) byLine.set(line, `Possible duplicate of line ${valid[result.earlier[0]].line}`);
    });
    return byLine;
  }, [parsed, fixtures]);
  const errors = parsed.filter((line) => line.error).length;
  const tooMany = parsed.length > MAX_BULK_LINES;

  return <form onSubmit={onSubmit} className={styles.form}>
    <p className={styles.muted}>One fixture per line: <code>date | opponent | competition | kickoff | venue | venue type</code>. Separate columns with a bar, or paste rows from a spreadsheet. Only the date (YYYY-MM-DD) and opponent are required; blank columns use the defaults below. Pasted fixtures are saved as scheduled.</p>
    <div className={styles.fields}>
      <label className={styles.fullWidth}>Fixtures<textarea name="lines" rows={7} value={lines} onChange={(event) => setLines(event.target.value)} placeholder={"2026-11-07 | World Girls | | 15:00 | SKD Sports Complex | home\n2026-11-14 | Earth Angels"} spellCheck={false} /></label>
      <label>Season<input name="season" required maxLength={30} placeholder="2026–27" value={season} onChange={(event) => setSeason(event.target.value)} /></label>
      <label>Default competition<select name="competition" value={competition} onChange={(event) => setCompetition(event.target.value)}>{competitions.map((entry) => <option key={entry.slug} value={entry.name}>{entry.name}</option>)}</select></label>
      <label>Default venue type<select name="venue_type" value={venueType} onChange={(event) => setVenueType(event.target.value)}>{VENUE_TYPES.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select></label>
      <label className={styles.checkbox}><input name="is_published" type="checkbox" defaultChecked /> Published on the public website</label>
    </div>
    {parsed.length > 0 && <div className={styles.preview}>
      <p className={styles.previewSummary}>{parsed.length - errors} ready · {errors} with errors{duplicates.size ? ` · ${duplicates.size} possible duplicates` : ""}</p>
      <ol>
        {parsed.map((line) => <li key={line.line} className={line.error ? styles.previewError : duplicates.has(line.line) ? styles.previewDuplicate : undefined}>
          <span>Line {line.line}</span>
          {line.input
            ? <span>{line.input.match_date} · {line.input.opponent} · {line.input.competition}{line.input.kickoff_time ? ` · ${line.input.kickoff_time}` : ""} · {line.input.venue_type}</span>
            : <span>{line.text}</span>}
          {line.error && <b>{line.error}</b>}
          {!line.error && duplicates.has(line.line) && <b>{duplicates.get(line.line)}</b>}
        </li>)}
      </ol>
    </div>}
    {tooMany && <p className={styles.error} role="alert">Paste at most {MAX_BULK_LINES} fixtures at a time.</p>}
    <button type="submit" disabled={pending || parsed.length === 0 || errors > 0 || tooMany}>
      {pending ? "Saving…" : errors > 0 ? "Fix the lines marked above" : `Save ${parsed.length} fixture${parsed.length === 1 ? "" : "s"}`}
    </button>
    {warning && <DuplicateWarning warning={warning} pending={pending} onCancel={cancel} />}
    <ActionMessage state={state} />
  </form>;
}

/** One form that creates a series: the same fixture every week or every few weeks. */
function RecurringForm({ competitions }: { competitions: Competition[] }) {
  const { state, pending, onSubmit, warning, cancel } = useFixtureAction(saveFixtureSeries);
  const [firstDate, setFirstDate] = useState("");
  const [everyWeeks, setEveryWeeks] = useState("1");
  const [count, setCount] = useState("8");
  const series = firstDate ? generateSeriesDates(firstDate, Number(everyWeeks), Number(count)) : null;
  const weekday = firstDate ? weekdayName(firstDate) : null;

  return <form onSubmit={onSubmit} className={styles.form}>
    <p className={styles.muted}>Creates a scheduled fixture on the same weekday for each match in the series. Each one can be edited on its own afterwards.</p>
    <div className={styles.fields}>
      <label>Opponent<input name="opponent" required maxLength={100} /></label>
      <label>Competition<CompetitionSelect competitions={competitions} inputName="competition" /></label>
      <label>Season<input name="season" required maxLength={30} placeholder="2026–27" /></label>
      <label>First match date<input name="first_date" type="date" required value={firstDate} onChange={(event) => setFirstDate(event.target.value)} /></label>
      <label>Repeat<select name="every_weeks" value={everyWeeks} onChange={(event) => setEveryWeeks(event.target.value)}>
        {Array.from({ length: MAX_SERIES_INTERVAL_WEEKS }, (_, index) => index + 1).map((weeks) => <option key={weeks} value={weeks}>{weeks === 1 ? "Every week" : `Every ${weeks} weeks`}</option>)}
      </select></label>
      <label>Number of matches<input name="count" type="number" min="2" max={MAX_SERIES_LENGTH} required value={count} onChange={(event) => setCount(event.target.value)} /></label>
      <label>Kickoff time<input name="kickoff_time" type="time" /></label>
      <label>Venue<input name="venue" maxLength={160} /></label>
      <label>Venue type<select name="venue_type" defaultValue="home">{VENUE_TYPES.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select></label>
      <label className={styles.fullWidth}>Notes<textarea name="notes" rows={2} maxLength={2000} /></label>
      <label className={styles.checkbox}><input name="is_published" type="checkbox" defaultChecked /> Published on the public website</label>
    </div>
    {series && (series.error !== null
      ? <p className={styles.error}>{series.error}</p>
      : <div className={styles.preview}>
        <p className={styles.previewSummary}>{series.dates.length} matches{weekday ? `, ${everyWeeks === "1" ? "every" : `every ${everyWeeks} weeks on a`} ${weekday}` : ""}</p>
        <p className={styles.muted}>{series.dates.join(" · ")}</p>
      </div>)}
    <button type="submit" disabled={pending || !series || series.error !== null}>{pending ? "Saving…" : "Create series"}</button>
    {warning && <DuplicateWarning warning={warning} pending={pending} onCancel={cancel} />}
    <ActionMessage state={state} />
  </form>;
}

function FixtureRow({ fixture, competitions }: { fixture: Fixture; competitions: Competition[] }) {
  const score = (fixture.status === "played" || fixture.status === "halftime") ? `${fixture.shaita_goals}–${fixture.opponent_goals}` : fixture.status;
  // A match left live after everyone went home is the one failure mode of a manual
  // status. Flag it here rather than on the public site, where it would just look
  // wrong to a fan.
  const stale = fixture.status === "live" && looksFinished(fixture.went_live_at, new Date());
  return <details className={styles.fixtureRow}>
    <summary>
      <span>{fixture.match_date} · {fixture.opponent}</span>
      <span>
        {stale && <b className={styles.staleLive}>Still live? </b>}
        {score}{fixture.is_published ? " · Published" : " · Draft"}
      </span>
    </summary>
    <FixtureForm key={fixture.id} fixture={fixture} competitions={competitions} title={`Edit ${fixture.opponent}`} />
  </details>;
}

export default function FixtureManager({
  fixtures,
  competitions,
}: {
  fixtures: Fixture[];
  competitions: Competition[];
}) {
  const results = fixtures.filter((fixture) => fixture.status === "played");
  const upcoming = fixtures.filter((fixture) => fixture.status !== "played");
  return <div className={styles.manager}>
    <div className={styles.stack}>
      <section className={styles.panel}><FixtureForm competitions={competitions} title="Add a fixture or result" /></section>
      <details className={`${styles.panel} ${styles.toolPanel}`}>
        <summary>Paste several fixtures</summary>
        <BulkPasteForm fixtures={fixtures} competitions={competitions} />
      </details>
      <details className={`${styles.panel} ${styles.toolPanel}`}>
        <summary>Repeat a fixture</summary>
        <RecurringForm competitions={competitions} />
      </details>
    </div>
    <section className={styles.panel}>
      <div className={styles.sectionTitle}><div><p className={styles.kicker}>SCHEDULE &amp; MATCH CENTRE</p><h2>All fixtures</h2></div><span>{fixtures.length} total</span></div>
      {fixtures.length === 0 ? <p className={styles.muted}>No fixtures yet. Add one above.</p> : <>
        <h3 className={styles.subheading}>Upcoming / other</h3>{upcoming.length ? upcoming.map((fixture) => <FixtureRow fixture={fixture} key={fixture.id} competitions={competitions} />) : <p className={styles.muted}>No upcoming fixtures.</p>}
        <h3 className={styles.subheading}>Results</h3>{results.length ? results.map((fixture) => <FixtureRow fixture={fixture} key={fixture.id} competitions={competitions} />) : <p className={styles.muted}>No results yet.</p>}
      </>}
    </section>
  </div>;
}

/**
 * Competition dropdown.
 *
 * A select rather than a datalist, because the competition decides which public
 * filter a fixture appears under, so an invented value would put the match in a
 * bucket nothing links to.
 *
 * The one escape hatch is deliberate: if a stored fixture carries a competition the
 * list does not contain - a legacy import, or one added after this page rendered -
 * that value is offered as an extra option and selected. Saving the fixture
 * unchanged therefore does not silently rewrite its competition, and a super admin
 * can add the missing entry at /admin/media.
 */
export function CompetitionSelect({
  competitions,
  stored,
  inputName,
  allowOther = true,
}: {
  competitions: Competition[];
  stored?: string | null;
  inputName: string;
  allowOther?: boolean;
}) {
  const match = matchCompetition(competitions, stored);
  const isKnown = match !== null && match.name === stored;
  const orphan = stored && !isKnown ? stored : null;

  return (
    <select
      name={inputName}
      defaultValue={orphan ?? match?.name ?? competitions[0]?.name ?? ""}
      required
    >
      {orphan && allowOther && (
        <option value={orphan}>{orphan} (not in the list)</option>
      )}
      {competitions.map((competition) => (
        <option key={competition.slug} value={competition.name}>
          {competition.name}
        </option>
      ))}
    </select>
  );
}
