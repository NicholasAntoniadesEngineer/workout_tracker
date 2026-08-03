# Workout tracker

An offline workout logger. Reps, sets, set times and day history live in the
browser's localStorage; CSV export/import moves the history between devices.

Live: https://nicholasantoniadesengineer.github.io/workout_tracker/

Add it to the iOS home screen from Safari for a full-screen app.

## Timing

Two clocks sit in the bar at the bottom of the screen.

**Workout** runs from *Start workout* to *End workout*. Logging a set starts the
workout if it is not already running, so forgetting the button costs nothing. A
workout left running past midnight freezes at its last set rather than counting
forever.

**Set** counts from the previous logged set — rest plus work — and resets itself
every time a set is logged. Nothing to remember to start.

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

Exercise add/remove and *Clear this day's sets* live behind the ✎ on the
Exercise column header, which keeps them off the logging screen.

## CSV columns

`Date, Day, Started, Ended, Exercise, Set, Reps, Side, Seconds, At`

`At` is when the set was logged; `Seconds` is the gap from the previous set.
Files exported before `At` existed still import.

`Date` is the merge key: importing a day whose `Date` already exists replaces it.
Editing the file in a spreadsheet can reformat that timestamp and duplicate the
day instead — format the column as text if you edit it.
