"use client";

import { useActionState, useState } from "react";
import { savePlayer, updatePlayer, togglePlayerPublished, removePlayer } from "./actions";
import type { FixtureActionState } from "@/types/fixtures";
import { FEET, isMinorFromDob } from "@/lib/matches/validation";
import { POSITIONS } from "@/lib/reference-data";
import ImageField from "@/app/admin/ImageField";
import styles from "./SquadManager.module.css";

const initial: FixtureActionState = { status: "idle", message: "" };

export type SquadRow = {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  position: string | null;
  preferred_foot: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  shirt_number: number | null;
  bio: string | null;
  photo_url: string | null;
  is_minor: boolean;
  is_published: boolean;
};

export default function SquadManager({ players }: { players: SquadRow[] }) {
  const [saveState, saveAction, savePending] = useActionState(savePlayer, initial);
  const [updateState, updateAction, updatePending] = useActionState(updatePlayer, initial);
  const [toggleState, toggleAction] = useActionState(togglePlayerPublished, initial);
  const [removeState, removeAction, removePending] = useActionState(removePlayer, initial);

  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [dobDraft, setDobDraft] = useState("");

  return (
    <div className={styles.wrap}>
      <section className={styles.notice}>
        <h2 className={styles.noticeTitle}>Date of birth is club-confidential</h2>
        <p>
          It is stored so the club can check eligibility, and it is never published. The public
          profile shows an age only. Players under 18 are flagged automatically and must not appear
          in any public age-sensitive context.
        </p>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          {players.length} {players.length === 1 ? "player" : "players"}
        </h2>

        {players.length === 0 ? (
          <p className={styles.hint}>No players yet. Add the first one below.</p>
        ) : (
          <ul className={styles.list}>
            {players.map((player) => {
              const isEditing = editing === player.id;
              return (
                <li className={styles.row} key={player.id}>
                  <div className={styles.identity}>
                    <span className={styles.name}>
                      {player.shirt_number !== null && <span className={styles.shirt}>#{player.shirt_number}</span>}
                      {player.full_name}
                    </span>
                    <span className={styles.meta}>
                      {[player.position, player.preferred_foot, player.height_cm && `${player.height_cm}cm`]
                        .filter(Boolean)
                        .join(" · ") || "No position recorded"}
                    </span>
                    <span className={styles.flags}>
                      {player.is_minor && (
                        <span className={styles.minor} title="Under 18. Never publish a date of birth.">
                          Under 18
                        </span>
                      )}
                      {player.is_published ? (
                        <span className={styles.published}>Published</span>
                      ) : (
                        <span className={styles.draft}>Unpublished</span>
                      )}
                    </span>
                  </div>

                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={styles.secondary}
                      onClick={() => {
                        setEditing(isEditing ? null : player.id);
                        setDobDraft(player.date_of_birth ?? "");
                      }}
                      aria-expanded={isEditing}
                    >
                      {isEditing ? "Close" : "Edit"}
                    </button>

                    <form action={toggleAction}>
                      <input type="hidden" name="id" value={player.id} />
                      <input type="hidden" name="publish" value={player.is_published ? "false" : "true"} />
                      <button type="submit" className={styles.secondary}>
                        {player.is_published ? "Unpublish" : "Publish"}
                      </button>
                    </form>

                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => setConfirming(confirming === player.id ? null : player.id)}
                      aria-expanded={confirming === player.id}
                    >
                      Remove
                    </button>
                  </div>

                  {isEditing && (
                    <form action={updateAction} className={styles.editForm}>
                      <input type="hidden" name="id" value={player.id} />
                      <PlayerFields dobDraft={dobDraft} setDobDraft={setDobDraft} player={player} />
                      <div className={styles.actions}>
                        <button type="submit" disabled={updatePending}>
                          {updatePending ? "Saving…" : "Save changes"}
                        </button>
                      </div>
                    </form>
                  )}

                  {confirming === player.id && (
                    <form action={removeAction} className={styles.confirm}>
                      <input type="hidden" name="id" value={player.id} />
                      <p className={styles.confirmText}>
                        Remove {player.full_name} from the squad list? Lineups and goals already
                        recorded keep the player&apos;s name.
                      </p>
                      <div className={styles.confirmActions}>
                        <button type="submit" className={styles.danger} disabled={removePending}>
                          {removePending ? "Removing…" : "Yes, remove"}
                        </button>
                        <button type="button" className={styles.secondary} onClick={() => setConfirming(null)}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <p className={updateState.status === "error" ? styles.error : styles.success} role="status" aria-live="polite">
          {updateState.message}
        </p>
        <p className={toggleState.status === "error" ? styles.error : styles.success} role="status" aria-live="polite">
          {toggleState.message}
        </p>
        <p className={removeState.status === "error" ? styles.error : styles.success} role="status" aria-live="polite">
          {removeState.message}
        </p>
      </section>

      <form action={saveAction} className={styles.card}>
        <h2 className={styles.cardTitle}>Add a player</h2>
        <p className={styles.hint}>New players start unpublished.</p>

        <PlayerFields dobDraft={dobDraft} setDobDraft={setDobDraft} />

        <div className={styles.actions}>
          <button type="submit" disabled={savePending}>
            {savePending ? "Adding…" : "Add player"}
          </button>
        </div>

        <p className={saveState.status === "error" ? styles.error : styles.success} role="status" aria-live="polite">
          {saveState.message}
        </p>
      </form>
    </div>
  );
}

/**
 * Shared field set for add and edit.
 *
 * The minor flag is recomputed live from the typed date so a contributor sees the
 * safeguarding consequence of what they are entering, before saving rather than
 * after.
 */
function PlayerFields({
  dobDraft,
  setDobDraft,
  player,
}: {
  dobDraft: string;
  setDobDraft: (value: string) => void;
  player?: SquadRow;
}) {
  const id = (name: string) => `${player ? "edit" : "new"}-${name}`;

  return (
    <div className={styles.fields}>
      <div className={styles.field}>
        <label htmlFor={id("name")}>Full name</label>
        <input id={id("name")} name="full_name" required maxLength={120} defaultValue={player?.full_name ?? ""} />
      </div>

      <div className={styles.field}>
        <label htmlFor={id("dob")}>Date of birth</label>
        <input
          id={id("dob")}
          name="date_of_birth"
          type="date"
          value={dobDraft}
          onChange={(event) => setDobDraft(event.target.value)}
        />
        <p className={styles.fieldHint}>
          {isMinorFromDob(dobDraft) ? (
            <span className={styles.minor}>Under 18 — this player is flagged as a minor.</span>
          ) : (
            "Confidential. Never published; the profile shows age only."
          )}
        </p>
      </div>

      <div className={styles.field}>
        <label htmlFor={id("position")}>Position</label>
        <select id={id("position")} name="position" defaultValue={player?.position ?? ""}>
          <option value="">Not set</option>
          {POSITIONS.map((position) => (
            <option key={position} value={position}>
              {position}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor={id("foot")}>Preferred foot</label>
        <select id={id("foot")} name="preferred_foot" defaultValue={player?.preferred_foot ?? ""}>
          <option value="">Not set</option>
          {FEET.map((foot) => (
            <option key={foot} value={foot}>
              {foot === "both" ? "Both" : foot === "left" ? "Left" : "Right"}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor={id("shirt")}>Squad number</label>
        <input
          id={id("shirt")}
          name="shirt_number"
          inputMode="numeric"
          defaultValue={player?.shirt_number ?? ""}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor={id("height")}>Height (cm)</label>
        <input
          id={id("height")}
          name="height_cm"
          inputMode="numeric"
          defaultValue={player?.height_cm ?? ""}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor={id("weight")}>Weight (kg)</label>
        <input
          id={id("weight")}
          name="weight_kg"
          inputMode="numeric"
          defaultValue={player?.weight_kg ?? ""}
        />
      </div>

      <div className={styles.fieldWide}>
        <ImageField
          name="photo_url"
          label="Photo"
          purpose="player"
          defaultValue={player?.photo_url ?? null}
          hint="Optional. Without one, the card and profile use the shirt artwork."
        />
      </div>

      <div className={`${styles.field} ${styles.fieldWide}`}>
        <label htmlFor={id("bio")}>Biography</label>
        <textarea
          id={id("bio")}
          name="bio"
          rows={4}
          defaultValue={player?.bio ?? ""}
          placeholder="Shown on the player's public profile."
        />
      </div>
    </div>
  );
}
