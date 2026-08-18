# Manual regression checklist

Use this checklist before and after user-interface changes. The restored application is the behavioral baseline. Unless a test says otherwise, run checks in a production build served with `pnpm preview`; service workers are not active in the development server.

Record the browser, operating system, viewport, build commit, base path, and whether the app was already installed or cached. Use a fresh profile for first-install and first-load checks, and a separate profile containing existing Human Units local-storage data for persistence checks.

## Automated prerequisite

- [ ] Record `git branch`, `git rev-parse HEAD`, and `git status --short`; confirm the intended feature branch and clean worktree.
- [ ] `pnpm test` passes.
- [ ] `pnpm build` passes, including service-worker and asset-path verification.
- [ ] `pnpm size` passes the 50 kB gzip initial-JavaScript budget.

## Converter states and actions

- [ ] On first load the input is empty, the result card is neutral, and it says that the result appears there.
- [ ] A valid query updates the result live without requiring Enter.
- [ ] A nonempty invalid or incomplete query uses the invalid presentation and exposes no result actions.
- [ ] Copy writes only the formatted result and destination symbol; the button temporarily reports `Copied!`.
- [ ] Denying clipboard permission or making the Clipboard API fail does not report a successful copy and does not break conversion.
- [ ] Pin changes to the pressed/pinned state; pressing it again unpins the pair.
- [ ] Swap makes the prior destination the source, uses the computed result as the new amount, recalculates, and records the swapped conversion in Recent.
- [ ] Pace values entered in clock form retain clock-style formatting after conversion and swap.
- [ ] The visible examples populate, evaluate, and record the selected conversion.

## Conversion coverage

Verify the displayed result as well as whether the query is accepted or rejected.

- [ ] Natural language: `10 km in miles` gives approximately `6.213711922 mi`.
- [ ] Alternate connector and question mark: `2 HOURS as minutes?` gives `120 min`.
- [ ] Clock-style pace: `7:00 min/mi to min/km` gives `4:21 min/km`.
- [ ] Scientific notation: `-2.5e3 µm → mm` gives `-2.5 mm`.
- [ ] Negative temperature: `−40 degrees Fahrenheit to celsius` gives `-40 °C`.
- [ ] Unicode square symbols: `1 m² to cm2` gives `10,000 cm²`.
- [ ] Unicode cubic symbols: `1 m³ as liters` gives `1,000 L`.
- [ ] Running pace: `4:00 min/km to min/mi` gives about `6.437376 min/mi`.
- [ ] Pace to speed: `7:00 /mi to mph` gives about `8.571428571 mph`.
- [ ] Swimming metric-to-yard pace: `1:30 /100 m to /100 yd` gives `1:22`.
- [ ] Swimming yard-to-metric pace: `1:20 /100 yd to /100 m` gives `1:27`.
- [ ] Rowing split: `1:45 /500 m to /km` gives `3:30`.
- [ ] Arbitrary-distance pace: `2:00 /200 m to /100 m` gives `1:00`.
- [ ] Absolute temperature: `32 f to c` gives `0 °C`.
- [ ] Temperature difference: `1 Fahrenheit difference to kelvin difference` gives about `0.5555555556 K Δ`.
- [ ] Fuel economy: `5 L/100km to mpg (US)` gives about `47.0429166 mpg (US)`.
- [ ] Calendar duration: `12 calendar months to calendar years` gives `1 year`.
- [ ] Fixed and calendar time remain distinct; `1 month to days` is rejected.
- [ ] Incompatible dimensions such as `1 kg to miles` are rejected.
- [ ] Unsupported semantic conversion `1 mg/dL to mmol/L` is rejected.
- [ ] Incompatible sound-level groups such as `1 dBV to dB SPL` are rejected.
- [ ] Compatible logarithmic sound power `1 dBm to dBW` gives `-29 dBW`.

## Recent history

- [ ] Merely typing a valid live conversion does not add it to Recent.
- [ ] Pressing Enter on a valid conversion adds it to Recent.
- [ ] Pressing Enter on an invalid conversion adds nothing.
- [ ] Repeating the same normalized query deduplicates it and moves it to the front.
- [ ] Adding nine distinct conversions retains only the newest eight.
- [ ] Removing one item deletes only that item and does not reuse it.
- [ ] Clear removes every recent item and restores the empty-state copy.
- [ ] Selecting a recent item restores and evaluates its query.
- [ ] Reloading preserves recent entries and their order.

## Pinned pairs

- [ ] Pinning stores the directed source-to-destination pair, not a numeric result.
- [ ] The reverse direction is a distinct pin.
- [ ] Unpinning removes only the current direction.
- [ ] Reusing a pin evaluates the pair with an amount of `1`.
- [ ] Adding nine distinct pins retains only the newest eight.
- [ ] Reloading preserves pins, order, direction, and pressed state for the current pair.

## Local storage

Use browser developer tools to inspect and, in a disposable profile, edit storage.

- [ ] History uses `humanunits:history:v1` and stores an array of `{ query, result }` objects.
- [ ] Pins use `humanunits:pins:v1` and store an array of `{ from, to, query }` objects.
- [ ] Existing valid values from the baseline load without data loss.
- [ ] On load, evaluable history queries are normalized against current symbols and formatting.
- [ ] On load, pin queries are reconstructed from stored `from` and `to` symbols.
- [ ] Missing keys produce empty collections.
- [ ] Malformed JSON produces empty collections without crashing.
- [ ] Valid JSON that is not an array produces empty collections without crashing.
- [ ] Blocked or quota-failing storage does not prevent conversion or other in-memory interaction.
- [ ] No prototype or replacement storage keys are created.

## Browse directory

- [ ] Browse reports exactly 506 units across 59 categories.
- [ ] All six category sections appear with the expected categories and counts.
- [ ] Multiple categories can be expanded and collapsed independently.
- [ ] Search matches a category name, full unit name, symbol, and alias.
- [ ] Searching `um` finds micrometer/`µm`.
- [ ] An unmatched search announces zero results and shows the correct empty message.
- [ ] Choosing the first unit enters source-selection mode and exposes Clear.
- [ ] The chosen source has selected/pressed semantics.
- [ ] Search and destination lists include only compatible units after source selection.
- [ ] Sound-level compatibility groups do not expose invalid cross-group destinations.
- [ ] Pace and speed remain mutually selectable through their shared compatibility group.
- [ ] Clear removes the source selection and search and restores the normal directory.
- [ ] Each of the six popular conversions opens a valid conversion.
- [ ] Completing a source/destination selection returns to Convert, focuses the input, selects the amount, and scrolls the amount into view.

## URLs and navigation

- [ ] Convert uses the application root URL.
- [ ] Browse uses `#pairs`.
- [ ] About uses `#about`.
- [ ] License uses `/license` beneath the configured application root.
- [ ] Direct-loading each URL displays the correct page.
- [ ] Browser Back and Forward restore the correct page and active navigation state.
- [ ] Modified clicks retain normal browser link behavior.
- [ ] Internal page navigation scrolls to the top.
- [ ] The root-relative build works at `/`.
- [ ] A build made with `BASE_PATH=/humanunits/` loads and navigates correctly beneath `/humanunits/`.
- [ ] Assets, manifest, icon, license URL, and service-worker scope resolve correctly at both base paths.

## Keyboard and focus

- [ ] On a fine-pointer device, initial load focuses the conversion input without scrolling the page.
- [ ] Initial load on a coarse-pointer/touch device does not force the software keyboard open.
- [ ] Escape clears a nonempty converter query and copied state.
- [ ] Tab and Shift+Tab reach every interactive control in a logical order.
- [ ] Every keyboard-focusable control has a clearly visible focus indicator.
- [ ] Enter submits the converter form and records valid history.
- [ ] All navigation, examples, result actions, history, pins, Browse controls, Install, update, and License links work without a pointer.
- [ ] Focus is not lost or placed in hidden content when page or converter states change.

## Accessibility semantics

- [ ] Primary navigation has an accessible name and the active link exposes `aria-current="page"`.
- [ ] The converter input has a visible label and its hint is associated through `aria-describedby`.
- [ ] The converter form retains search semantics.
- [ ] Result changes are announced once through the polite, atomic live region without excessive typing announcements.
- [ ] Pin and selected-unit controls expose the correct `aria-pressed` value.
- [ ] Category controls expose the correct `aria-expanded` value.
- [ ] Browse source selection and update availability are announced as status changes.
- [ ] Search-result counts update through a polite live region.
- [ ] Remove-history controls have labels identifying the affected query.
- [ ] Decorative SVGs are hidden from assistive technology.
- [ ] Headings and labelled sections provide a coherent document outline on every page.
- [ ] Disabled incompatible units are communicated as disabled.

## Responsive layout and zoom

- [ ] At 320 px wide there is no horizontal page overflow and no clipped action or navigation text.
- [ ] Check representative mobile widths around 370 px and 460 px.
- [ ] Check tablet widths around 720 px and 780 px.
- [ ] Check desktop widths at 1024 px and wider.
- [ ] Converter collections remain reachable when vertical space is constrained.
- [ ] Browse grids collapse correctly and every unit name remains readable.
- [ ] Footer content remains visible and respects safe-area insets.
- [ ] At 200% and 400% browser zoom, content reflows without loss of information or functionality.
- [ ] Long results, scientific notation, and long unit names do not cause horizontal overflow.

## Motion

- [ ] With normal motion preferences, transitions do not delay input or interfere with focus.
- [ ] With `prefers-reduced-motion: reduce`, animations and smooth transitions are effectively disabled.
- [ ] Page and state changes do not cause disorienting scroll or layout movement.

## PWA installation, offline use, and updates

- [ ] In a supported secure-context browser, the captured install prompt exposes the header Install action.
- [ ] Choosing Install invokes the browser prompt.
- [ ] Completing installation removes the Install action.
- [ ] Dismissing or lacking an install prompt leaves the converter fully usable.
- [ ] After one successful production load, close all app tabs, disable the network, and confirm offline startup.
- [ ] While offline, Convert, Browse, About, License, history, pins, and real conversion calculations remain usable.
- [ ] Offline navigation falls back to the application shell rather than a browser error.
- [ ] Build and serve a changed version; an already controlled client continues to show the cached version while the new worker installs.
- [ ] When the new worker waits, the header shows Update instead of Install and does not show a popup.
- [ ] Choosing Update activates the waiting worker and reloads once after `controllerchange`.
- [ ] After updating, the header restores Install when installation is available, or shows neither action when already installed.
- [ ] The new worker removes obsolete `humanunits-*` caches while retaining its current cache.
- [ ] A service-worker registration failure leaves online conversion usable.

## Content and privacy

- [ ] About accurately describes local conversion, privacy, coverage, accuracy, open-source licensing, and installation.
- [ ] License displays the complete MIT License and copyright notice.
- [ ] Footer displays `Private`, `Works offline`, `No tracking`, and the MIT license link.
- [ ] No account, analytics, advertising, third-party request, or runtime conversion API is introduced.
- [ ] With the network panel open, normal conversion and reuse make no third-party requests.

## Evidence record

- [ ] Record all checks actually performed and their result.
- [ ] Record skipped checks with the missing browser, device, permission, secure context, cached baseline, or other blocker.
- [ ] Keep screenshots outside the repository or attach them to review tooling; do not commit large image files.
- [ ] Confirm `git diff --stat` and `git diff --name-only` contain only the intended test and checklist files.
