# Workout tracker

An offline workout logger. Reps, sets, per-set times and day history live in the
browser's localStorage; CSV export/import moves the history between devices.

Live: https://nicholasantoniadesengineer.github.io/workout_tracker/

Add it to the iOS home screen from Safari for a full-screen app.

## Layout

    index.html    page shell
    styles.css    both themes, driven by prefers-color-scheme
    js/model.js   sets, totals, clock formatting
    js/store.js   state, localStorage, day merging
    js/timer.js   set timer, wall-clock based
    js/csv.js     export and import
    js/views.js   markup
    js/app.js     events and entry point

ES modules, so it must be served over http(s) — opening index.html from the
filesystem will not work.

## CSV columns

`Date, Day, Started, Ended, Exercise, Set, Reps, Side, Seconds`

`Date` is the merge key: importing a day whose `Date` already exists replaces it.
Editing the file in a spreadsheet can reformat that timestamp and duplicate the
day instead — format the column as text if you edit it.
