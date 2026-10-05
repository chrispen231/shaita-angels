"use client";

import { useActionState } from "react";
import type { Fixture, FixtureActionState } from "@/types/fixtures";
import { saveFixture } from "./actions";
import styles from "./Admin.module.css";

const initial: FixtureActionState = { status: "idle", message: "" };

function FixtureForm({ fixture, title }: { fixture?: Fixture; title: string }) {
  const [state, action, pending] = useActionState(saveFixture, initial);
  return <form action={action} className={styles.form}>
    {fixture && <input type="hidden" name="id" value={fixture.id} />}
    <h3>{title}</h3>
    <div className={styles.fields}>
      <label>Opponent<input name="opponent" required maxLength={100} defaultValue={fixture?.opponent} /></label>
      <label>Competition<input name="competition" required maxLength={120} defaultValue={fixture?.competition} /></label>
      <label>Season<input name="season" required maxLength={30} placeholder="2026–27" defaultValue={fixture?.season} /></label>
      <label>Match date<input name="match_date" type="date" required defaultValue={fixture?.match_date} /></label>
      <label>Kickoff time<input name="kickoff_time" type="time" defaultValue={fixture?.kickoff_time?.slice(0, 5) ?? ""} /></label>
      <label>Venue<input name="venue" maxLength={160} defaultValue={fixture?.venue ?? ""} /></label>
      <label>Venue type<select name="venue_type" defaultValue={fixture?.venue_type ?? "home"}><option value="home">Home</option><option value="away">Away</option><option value="neutral">Neutral</option></select></label>
      <label>Match status<select name="status" defaultValue={fixture?.status ?? "scheduled"}><option value="scheduled">Scheduled</option><option value="played">Played</option><option value="postponed">Postponed</option><option value="cancelled">Cancelled</option></select></label>
      <label>Shaita goals<input name="shaita_goals" type="number" min="0" max="99" defaultValue={fixture?.shaita_goals ?? ""} /></label>
      <label>Opponent goals<input name="opponent_goals" type="number" min="0" max="99" defaultValue={fixture?.opponent_goals ?? ""} /></label>
      <label className={styles.fullWidth}>Notes<textarea name="notes" rows={3} maxLength={2000} defaultValue={fixture?.notes ?? ""} /></label>
      <label className={styles.checkbox}><input name="is_published" type="checkbox" defaultChecked={fixture?.is_published ?? true} /> Published on the public website</label>
    </div>
    <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save fixture"}</button>
    {state.message && <p className={state.status === "error" ? styles.error : styles.feedback} role={state.status === "error" ? "alert" : "status"}>{state.message}</p>}
  </form>;
}

function FixtureRow({ fixture }: { fixture: Fixture }) {
  const score = fixture.status === "played" ? `${fixture.shaita_goals}–${fixture.opponent_goals}` : fixture.status;
  return <details className={styles.fixtureRow}>
    <summary><span>{fixture.match_date} · {fixture.opponent}</span><span>{score}{fixture.is_published ? " · Published" : " · Draft"}</span></summary>
    <FixtureForm key={fixture.id} fixture={fixture} title={`Edit ${fixture.opponent}`} />
  </details>;
}

export default function FixtureManager({ fixtures }: { fixtures: Fixture[] }) {
  const results = fixtures.filter((fixture) => fixture.status === "played");
  const upcoming = fixtures.filter((fixture) => fixture.status !== "played");
  return <div className={styles.manager}>
    <section className={styles.panel}><FixtureForm title="Add a fixture or result" /></section>
    <section className={styles.panel}>
      <div className={styles.sectionTitle}><div><p className={styles.kicker}>SCHEDULE &amp; MATCH CENTRE</p><h2>All fixtures</h2></div><span>{fixtures.length} total</span></div>
      {fixtures.length === 0 ? <p className={styles.muted}>No fixtures yet. Add one above.</p> : <>
        <h3 className={styles.subheading}>Upcoming / other</h3>{upcoming.length ? upcoming.map((fixture) => <FixtureRow fixture={fixture} key={fixture.id} />) : <p className={styles.muted}>No upcoming fixtures.</p>}
        <h3 className={styles.subheading}>Results</h3>{results.length ? results.map((fixture) => <FixtureRow fixture={fixture} key={fixture.id} />) : <p className={styles.muted}>No results yet.</p>}
      </>}
    </section>
  </div>;
}
