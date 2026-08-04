# Workout tracker

An offline rep logger. Everything lives in the browser's localStorage; CSV
export/import moves history between devices.

**[nicholasantoniadesengineer.github.io/workout_tracker](https://nicholasantoniadesengineer.github.io/workout_tracker/)**
— add it to the iOS home screen from Safari for a full-screen app.

<p>
  <img src="docs/log.png" width="270" alt="Logging screen">
  <img src="docs/settings.png" width="270" alt="Settings">
  <img src="docs/dark.png" width="270" alt="Dark theme">
</p>

## Using it

A day starts empty. *+ Add* opens your whole list as a sheet over the app — pick
several, drop several, then Done. The strip under the table holds only today's
exercises, so switching between them stays one tap, and *− Remove* drops the
selected one at any point. Hold an exercise in the table and drag it up or down
to reorder the day.

Two clocks sit at the bottom. **Workout** runs between *Start workout* and *End
workout*; tap the clock to type in a time you have already been going. **Rest**
counts from the last set. *Start set* stamps the beginning of a set, so logging
it records the work time separately from the rest before it.

Sets can carry weight. The chip beside *Per side* reads *Bodyweight* until you
tap it, then offers quick weights and a box to type any other. The grid shows the
load against the reps — `10¹²` is ten at twelve — and Σ stays a plain rep count.

## Settings

Text size, theme, weight unit, whether per-side sets count double, starting reps,
and when an idle workout ends itself.

## Notes

Text size is *Auto* by default: the logging screen never scrolls vertically,
because the type shrinks until the day fits. Pick a fixed size instead and it is
kept exactly, with the screen scrolling if the day outgrows it.

Sets grow rightward, so the table scrolls sideways past three columns.

CSV columns: `Date, Day, Started, Ended, Exercise, Set, Reps, Side, Weight, Rest, Work, At`.
`Date` is the merge key, so re-importing a day replaces it; a spreadsheet that
reformats that column will duplicate the day instead.

ES modules — serve over http(s), not `file://`.
