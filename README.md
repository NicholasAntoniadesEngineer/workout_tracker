# Workout tracker

An offline rep logger. Everything lives in the browser's localStorage; CSV or
JSON export/import moves history between devices. A service worker precaches
the whole app, so it opens instantly and works with no network at all.

**[nicholasantoniadesengineer.github.io/workout_tracker](https://nicholasantoniadesengineer.github.io/workout_tracker/)**
— add it to the iOS home screen from Safari for a full-screen app.

<p>
  <img src="docs/log.png" width="270" alt="Logging screen">
  <img src="docs/settings.png" width="270" alt="Settings">
  <img src="docs/dark.png" width="270" alt="Dark theme">
</p>

## Using it

A day starts empty. *+ Add* opens your whole list as a sheet over the app,
grouped by movement — squat, hinge, push, pull, core, carry, lower leg, with
anything you add yourself under *Other*. Pick several, drop several, then Done.
The strip under the table holds only today's exercises, so switching between
them stays one tap, and *− Remove* drops the selected one at any point. Hold an
exercise in the table and drag it up or down to reorder the day.

The built-in list lives in `EXERCISE_GROUPS` in `js/model.js`. A name added
there reaches devices that already have a saved list, once; deleting one makes
it stay deleted.

Two clocks sit at the bottom. **Workout** runs between *Start workout* and *End
workout*; tap the clock to type in a time you have already been going. **Rest**
counts from the last set. *Start set* stamps the beginning of a set, so logging
it records the work time separately from the rest before it.

Sets can carry weight. The chip beside *Per side* reads *Bodyweight* until you
tap it, then offers quick weights and a box to type any other. The grid shows the
load against the reps — `10¹²` is ten at twelve — and Σ stays a plain rep count.

Each exercise remembers its reps, weight and per-side setting from the last set
you logged of it, so coming back to it mid-workout needs no re-entering. One that
has never been logged starts at bodyweight rather than inheriting a load.

A line above the stepper shows what the selected exercise did the last day it
was trained; tapping it opens the exercise's full history — best weight,
estimated 1RM, best reps, and every day's sets. *Warm-up* marks a set that
should be seen but never counted: it sits dimmed in the grid and stays out of
totals, records and trends. *Secs* switches an exercise to counting seconds
instead of reps — planks, carries, wall sits — and its Σ becomes time.

The home screen offers *Repeat* under the start button when a day is empty, and
every day in History has a ⧉ button: either starts a fresh workout today with
that day's exercises already picked. *Progress* graphs weekly volume, a trend
line per exercise and the records table; *Body* keeps a daily log of weight and
a few measurements with its own trend.

Deleting a day, a set, or an exercise's logged sets takes effect at once and
floats an *Undo* for a few seconds instead of asking first.

## Settings

Text size, theme, weight unit, whether per-side sets count double, starting reps,
a rest target (the rest clock turns amber and the phone buzzes when it passes),
and when an idle workout ends itself. Switching the weight unit converts every
stored weight and measurement — 24 kg becomes 52.9 lb, not a relabelled 24.

## Notes

Text size is *Auto* by default: the logging screen never scrolls vertically,
because the type shrinks until the day fits. Pick a fixed size instead and it is
kept exactly, with the screen scrolling if the day outgrows it.

Sets grow rightward, so the table scrolls sideways past three columns.

CSV columns: `Date, Day, Started, Ended, Exercise, Set, Reps, Side, Weight, Rest,
Work, At, Mark, Mode` — `Mark` is `warmup` for warm-up sets, `Mode` is `sec`
for timed exercises. `Date` is the merge key, so re-importing a day replaces it;
a spreadsheet that reformats that column will duplicate the day instead. The
JSON *Backup* button exports everything — days, the exercise list, settings and
the body log — and the one *Load* button accepts either format.

ES modules — serve over http(s), not `file://`.
