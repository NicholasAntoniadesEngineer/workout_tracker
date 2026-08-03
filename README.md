# Workout tracker

An offline workout logger. Reps, sets, set times and day history live in the
browser's localStorage; CSV export/import moves the history between devices.

Live: https://nicholasantoniadesengineer.github.io/workout_tracker/

Add it to the iOS home screen from Safari for a full-screen app.

## Timing

Two clocks sit in the bar at the bottom of the screen.

**Workout** runs from *Start workout* to *End workout*. Logging a set starts the
workout if it is not already running, so forgetting the button costs nothing.
*Start* means a new workout begins now — coming back to a day you trained in the
morning gives a fresh clock, not one spanning lunch — except within 30 minutes
of ending, where restarting picks the same clock back up. A workout nobody ends
stops itself an hour after its last set, backdated to that set, so a session left
running overnight reads as the workout it actually was.

**Since last set** counts from the previous logged set — rest plus work — and
resets itself every time a set is logged. Nothing to remember to start. It never
counts from before the workout began.

*Mark now* freezes the set clock at that instant and stamps the time. Log the
set afterwards, at whatever pace you like, and it is recorded at the marked time
rather than the moment you finished entering reps; the rest clock then counts
from the mark too. Tap again to clear it.

Every set stores the wall-clock time it happened, so both clocks are derived
from stored stamps: backgrounding the phone, reloading, or reinstalling the app
cannot drift them.

## Layout

    index.html    page shell
    styles.css    both themes, driven by prefers-color-scheme
    js/model.js   sets, workout state, clocks, totals
    js/store.js   state, localStorage, day merging
    js/csv.js     export and import
    js/views.js   markup
    js/app.js     events, fit-to-window, entry point

ES modules, so it must be served over http(s) — opening index.html from the
filesystem will not work.

## Fitting the screen

The log screen never scrolls vertically. `fit()` in `js/app.js` shrinks a single
scale variable (`--k`, which every size in `styles.css` is expressed against)
until the day fits the window, down to a floor of 0.62. Sets grow rightward
without limit, so the table — and only the table — scrolls sideways, with the
exercise column pinned.

The exercise strip under the table scrolls sideways too, so it costs the same
height whether your list holds five exercises or fifty.

## Choosing exercises

A day starts empty. The strip under the table is on screen the whole time:
today's exercises first, then everything else prefixed with a + to add it.
Tapping a name selects it for logging.

*+ New* and *− Remove* are pinned to the right of that strip, outside the
scroller, so both stay one tap away however long the list grows. *− Remove*
drops whichever exercise is selected, at any point — mid-workout included — and
hides itself while you are typing a new name. Escape cancels typing.

Your list is every exercise you have ever used: `SEED_EXERCISES` in
`js/model.js` on a fresh install, plus anything you add or import. Dropping an
exercise from a day leaves it in the list; the ✎ on the Exercise column header
opens the fuller editor, where the × beside a name in *Your list* removes it for
good, and where *Clear this day's sets* lives. Dropping an exercise that already
has sets asks first, and says how many it will delete.

## CSV columns

`Date, Day, Started, Ended, Exercise, Set, Reps, Side, Seconds, At`

`At` is when the set was logged; `Seconds` is the gap from the previous set.

`Date` is the merge key: importing a day whose `Date` already exists replaces it.
Editing the file in a spreadsheet can reformat that timestamp and duplicate the
day instead — format the column as text if you edit it.
