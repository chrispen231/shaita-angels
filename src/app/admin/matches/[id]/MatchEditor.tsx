"use client";

import { useActionState, useState } from "react";
import { saveLineup, saveGoals, saveCards, saveReport } from "./actions";
import type { FixtureActionState } from "@/types/fixtures";
import {
  POSITIONS,
  CARD_TYPES,
  SIDES,
  formatMinute,
  type CardType,
  type Side,
} from "@/lib/matches/validation";
import styles from "./MatchEditor.module.css";

/**
 * Match content editor: lineups, goals, cards and the report, in one screen.
 *
 * Rows are edited as a set and saved wholesale. Each list keeps one blank row at
 * the end so adding a player is typing, not a button press, and blank rows are
 * dropped on submit rather than treated as errors.
 *
 * Client-side validation mirrors the server actions on purpose: the server is the
 * boundary, this is only so a contributor sees the problem before the round trip.
 */

const initial: FixtureActionState = { status: "idle", message: "" };

export type LineupRow = {
  player_name: string;
  shirt_number: number | null;
  position: string | null;
  is_starter: boolean;
  sort_order: number;
};

export type GoalRow = {
  player_name: string;
  side: Side;
  minute: number;
  added_stoppage_minutes: boolean;
  is_own_goal: boolean;
  assist_note: string | null;
  sort_order: number;
};

export type CardRow = {
  player_name: string;
  side: Side;
  card: CardType;
  minute: number;
  added_stoppage_minutes: boolean;
  sort_order: number;
};

const SIDES_: readonly Side[] = SIDES;

export default function MatchEditor({
  fixtureId,
  opponent,
  lineup,
  goals,
  cards,
  report,
  squadNames,
}: {
  fixtureId: string;
  opponent: string;
  lineup: LineupRow[];
  goals: GoalRow[];
  cards: CardRow[];
  report: string;
  squadNames: string[];
}) {
  const [lineupState, lineupAction, lineupPending] = useActionState(saveLineup, initial);
  const [goalState, goalAction, goalPending] = useActionState(saveGoals, initial);
  const [cardState, cardAction, cardPending] = useActionState(saveCards, initial);
  const [reportState, reportAction, reportPending] = useActionState(saveReport, initial);

  // One extra blank row per list, always kept at the end.
  const [lineupRows, setLineupRows] = useState([
    ...lineup,
    { player_name: "", shirt_number: null, position: "", is_starter: true, sort_order: 0 },
  ]);
  const [goalRows, setGoalRows] = useState([
    ...goals,
    {
      player_name: "",
      side: "shaita" as Side,
      minute: 1,
      added_stoppage_minutes: false,
      is_own_goal: false,
      assist_note: "",
      sort_order: 0,
    },
  ]);
  const [cardRows, setCardRows] = useState([
    ...cards,
    {
      player_name: "",
      side: "shaita" as Side,
      card: "yellow" as CardType,
      minute: 1,
      added_stoppage_minutes: false,
      sort_order: 0,
    },
  ]);

  const updateLineup = (index: number, patch: Partial<(typeof lineupRows)[number]>) =>
    setLineupRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const updateGoal = (index: number, patch: Partial<(typeof goalRows)[number]>) =>
    setGoalRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const updateCard = (index: number, patch: Partial<(typeof cardRows)[number]>) =>
    setCardRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  return (
    <div className={styles.wrap}>
      <p className={styles.intro}>
        Everything here appears on the public match page for {opponent}. A fixture is never
        deleted, only unpublished, so a correction is always an edit.
      </p>

      <datalist id="squad-names">
        {squadNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <input type="hidden" name="fixture_id" value={fixtureId} />

      {/* ---------------------------------------------------------------- */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Lineups</h2>
        <p className={styles.hint}>
          Shirt numbers must be unique within this match. Leave a number blank if the player has
          none. Names that match the squad list are linked automatically, so player statistics
          accumulate across matches.
        </p>

        <form action={lineupAction} className={styles.form}>
          <input type="hidden" name="fixture_id" value={fixtureId} />

          <ul className={styles.rows}>
            {lineupRows.map((row, index) => (
              <li className={styles.row} key={index}>
                <span className={styles.index}>{index + 1}</span>

                <label className={styles.srOnly} htmlFor={`lineup-name-${index}`}>
                  Player {index + 1} name
                </label>
                <input
                  id={`lineup-name-${index}`}
                  name={`lineup_name`}
                  list="squad-names"
                  className={styles.name}
                  placeholder="Full name"
                  value={row.player_name}
                  onChange={(event) => updateLineup(index, { player_name: event.target.value })}
                />

                <label className={styles.srOnly} htmlFor={`lineup-shirt-${index}`}>
                  Shirt number for player {index + 1}
                </label>
                <input
                  id={`lineup-shirt-${index}`}
                  name={`lineup_shirt_${index}`}
                  className={styles.shirt}
                  placeholder="#"
                  inputMode="numeric"
                  value={row.shirt_number ?? ""}
                  onChange={(event) =>
                    updateLineup(index, {
                      shirt_number: event.target.value === "" ? null : Number(event.target.value),
                    })
                  }
                />

                <label className={styles.srOnly} htmlFor={`lineup-position-${index}`}>
                  Position for player {index + 1}
                </label>
                <select
                  id={`lineup-position-${index}`}
                  name={`lineup_position_${index}`}
                  value={row.position ?? ""}
                  onChange={(event) => updateLineup(index, { position: event.target.value })}
                >
                  <option value="">Position</option>
                  {POSITIONS.map((position) => (
                    <option key={position} value={position}>
                      {position}
                    </option>
                  ))}
                </select>

                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    name={`lineup_starter_${index}`}
                    checked={row.is_starter}
                    onChange={(event) => updateLineup(index, { is_starter: event.target.checked })}
                  />
                  <span>Starter</span>
                </label>

                <button
                  type="button"
                  className={styles.removeRow}
                  onClick={() => setLineupRows((rows) => rows.filter((_, i) => i !== index))}
                  disabled={lineupRows.length === 1}
                  aria-label={`Remove player ${index + 1}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondary}
              onClick={() =>
                setLineupRows((rows) => [
                  ...rows,
                  { player_name: "", shirt_number: null, position: "", is_starter: true, sort_order: 0 },
                ])
              }
            >
              Add player
            </button>
            <button type="submit" disabled={lineupPending}>
              {lineupPending ? "Saving…" : "Save lineup"}
            </button>
          </div>

          <Status state={lineupState} />
        </form>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Goals</h2>
        <p className={styles.hint}>
          Enter stoppage time as the total minute, so a goal at 90+3 is minute 93 with the
          stoppage box ticked.
        </p>

        <form action={goalAction} className={styles.form}>
          <input type="hidden" name="fixture_id" value={fixtureId} />

          <ul className={styles.rows}>
            {goalRows.map((row, index) => (
              <li className={styles.row} key={index}>
                <label className={styles.srOnly} htmlFor={`goal-name-${index}`}>
                  Goal {index + 1} scorer
                </label>
                <input
                  id={`goal-name-${index}`}
                  name="goal_name"
                  list="squad-names"
                  className={styles.name}
                  placeholder="Scorer"
                  value={row.player_name}
                  onChange={(event) => updateGoal(index, { player_name: event.target.value })}
                />

                <label className={styles.srOnly} htmlFor={`goal-side-${index}`}>
                  Side for goal {index + 1}
                </label>
                <select
                  id={`goal-side-${index}`}
                  name={`goal_side_${index}`}
                  value={row.side}
                  onChange={(event) => updateGoal(index, { side: event.target.value as Side })}
                >
                  {SIDES_.map((side) => (
                    <option key={side} value={side}>
                      {side === "shaita" ? "Shaita" : "Opponent"}
                    </option>
                  ))}
                </select>

                <label className={styles.srOnly} htmlFor={`goal-minute-${index}`}>
                  Minute for goal {index + 1}
                </label>
                <input
                  id={`goal-minute-${index}`}
                  name={`goal_minute_${index}`}
                  className={styles.minute}
                  inputMode="numeric"
                  value={row.minute}
                  onChange={(event) => updateGoal(index, { minute: Number(event.target.value) })}
                />

                <span className={styles.minutePreview} aria-hidden="true">
                  {formatMinute(row.minute, row.added_stoppage_minutes)}
                </span>

                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    name={`goal_stoppage_${index}`}
                    checked={row.added_stoppage_minutes}
                    onChange={(event) =>
                      updateGoal(index, { added_stoppage_minutes: event.target.checked })
                    }
                  />
                  <span>Stoppage</span>
                </label>

                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    name={`goal_own_goal_${index}`}
                    checked={row.is_own_goal}
                    onChange={(event) => updateGoal(index, { is_own_goal: event.target.checked })}
                  />
                  <span>Own goal</span>
                </label>

                <label className={styles.srOnly} htmlFor={`goal-note-${index}`}>
                  Note for goal {index + 1}
                </label>
                <input
                  id={`goal-note-${index}`}
                  name={`goal_note_${index}`}
                  className={styles.note}
                  placeholder="Header from a corner"
                  value={row.assist_note ?? ""}
                  onChange={(event) => updateGoal(index, { assist_note: event.target.value })}
                />

                <button
                  type="button"
                  className={styles.removeRow}
                  onClick={() => setGoalRows((rows) => rows.filter((_, i) => i !== index))}
                  disabled={goalRows.length === 1}
                  aria-label={`Remove goal ${index + 1}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondary}
              onClick={() =>
                setGoalRows((rows) => [
                  ...rows,
                  {
                    player_name: "",
                    side: "shaita",
                    minute: 1,
                    added_stoppage_minutes: false,
                    is_own_goal: false,
                    assist_note: "",
                    sort_order: 0,
                  },
                ])
              }
            >
              Add goal
            </button>
            <button type="submit" disabled={goalPending}>
              {goalPending ? "Saving…" : "Save goals"}
            </button>
          </div>

          <Status state={goalState} />
        </form>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Cards</h2>

        <form action={cardAction} className={styles.form}>
          <input type="hidden" name="fixture_id" value={fixtureId} />

          <ul className={styles.rows}>
            {cardRows.map((row, index) => (
              <li className={styles.row} key={index}>
                <label className={styles.srOnly} htmlFor={`card-name-${index}`}>
                  Card {index + 1} player
                </label>
                <input
                  id={`card-name-${index}`}
                  name="cardrow_name"
                  list="squad-names"
                  className={styles.name}
                  placeholder="Player"
                  value={row.player_name}
                  onChange={(event) => updateCard(index, { player_name: event.target.value })}
                />

                <label className={styles.srOnly} htmlFor={`card-type-${index}`}>
                  Card {index + 1} type
                </label>
                <select
                  id={`card-type-${index}`}
                  name={`cardrow_card_${index}`}
                  value={row.card}
                  onChange={(event) => updateCard(index, { card: event.target.value as CardType })}
                >
                  {CARD_TYPES.map((card) => (
                    <option key={card} value={card}>
                      {card === "second_yellow" ? "Second yellow" : card}
                    </option>
                  ))}
                </select>

                <label className={styles.srOnly} htmlFor={`card-side-${index}`}>
                  Side for card {index + 1}
                </label>
                <select
                  id={`card-side-${index}`}
                  name={`cardrow_side_${index}`}
                  value={row.side}
                  onChange={(event) => updateCard(index, { side: event.target.value as Side })}
                >
                  {SIDES_.map((side) => (
                    <option key={side} value={side}>
                      {side === "shaita" ? "Shaita" : "Opponent"}
                    </option>
                  ))}
                </select>

                <label className={styles.srOnly} htmlFor={`card-minute-${index}`}>
                  Minute for card {index + 1}
                </label>
                <input
                  id={`card-minute-${index}`}
                  name={`cardrow_minute_${index}`}
                  className={styles.minute}
                  inputMode="numeric"
                  value={row.minute}
                  onChange={(event) => updateCard(index, { minute: Number(event.target.value) })}
                />

                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    name={`cardrow_stoppage_${index}`}
                    checked={row.added_stoppage_minutes}
                    onChange={(event) =>
                      updateCard(index, { added_stoppage_minutes: event.target.checked })
                    }
                  />
                  <span>Stoppage</span>
                </label>

                <button
                  type="button"
                  className={styles.removeRow}
                  onClick={() => setCardRows((rows) => rows.filter((_, i) => i !== index))}
                  disabled={cardRows.length === 1}
                  aria-label={`Remove card ${index + 1}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondary}
              onClick={() =>
                setCardRows((rows) => [
                  ...rows,
                  {
                    player_name: "",
                    side: "shaita",
                    card: "yellow",
                    minute: 1,
                    added_stoppage_minutes: false,
                    sort_order: 0,
                  },
                ])
              }
            >
              Add card
            </button>
            <button type="submit" disabled={cardPending}>
              {cardPending ? "Saving…" : "Save cards"}
            </button>
          </div>

          <Status state={cardState} />
        </form>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Match report</h2>
        <p className={styles.hint}>
          The written summary shown on the match page. Clearing this removes the report.
        </p>

        <form action={reportAction} className={styles.form}>
          <input type="hidden" name="fixture_id" value={fixtureId} />
          <label className={styles.srOnly} htmlFor="report-body">
            Match report
          </label>
          <textarea
            id="report-body"
            name="body"
            className={styles.textarea}
            rows={10}
            defaultValue={report}
            placeholder="How the match went."
          />
          <div className={styles.actions}>
            <button type="submit" disabled={reportPending}>
              {reportPending ? "Saving…" : "Save report"}
            </button>
          </div>
          <Status state={reportState} />
        </form>
      </section>
    </div>
  );
}

function Status({ state }: { state: FixtureActionState }) {
  return (
    <p
      className={state.status === "error" ? styles.error : styles.success}
      role={state.status === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      {state.message}
    </p>
  );
}
