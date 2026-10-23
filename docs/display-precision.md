# Display precision: why it works the way it does

This documents the "Decimals" control and the rounding rule behind it. The
design was argued out in October 2026 after two earlier attempts. Read this
before changing anything in `formatDecimals`, `significantDigitsFor`, or the
stepper in `App.jsx`.

## History

1. **Decimal places (original).** Intuitive on everyday numbers, but small
   results vanished: `23 m² in mi²` is about 0.00000888, which shows as `0.00`.
   That is a wrong-looking result and was the reason for the next change.
2. **Significant digits (August 2026).** Never loses a result, but confuses
   everyone who is not a scientist: at 1 significant digit `6367.325634`
   becomes `6000`, which reads as a bug.
3. **Decimals with a magnitude rule (October 2026, current).** Behaves like
   decimal places on everyday numbers and like significant digits on small or
   huge ones, with one control and no mode switch.

## The rule

The user picks a number of decimals, 0 to 15, default 3. The engine turns that
into a significant-digit count based on the result's magnitude:

| Result | Digits shown | Example at 2 decimals |
| --- | --- | --- |
| 1 or more, below a trillion | N digits after the decimal point | 6367.325634 → `6,367.33` |
| Below 1 | N digits after the first nonzero digit | 0.00123 → `0.00123` (it only has 3 meaningful digits) |
| Below 0.0001 or a trillion and up | Scientific notation, N digits after the leading digit | 8.88034e-6 → `8.88e-6` |
| Feet and inches | N decimals on the inches, carrying to the next foot | 180 cm → `5 ft 10.87 in`; at 0 → `5 ft 11 in` |
| Clock-style pace | N decimals on the seconds | 4:45 min/mi → `2:57.09 min/km` |

Properties this guarantees:

- A nonzero result never displays as zero, at any setting.
- Trailing zeros are trimmed. `2 km to m` is `2,000 m`, never `2,000.000 m`.
- Output never exceeds 15 significant digits. That is the limit of IEEE
  doubles; more would be floating-point noise presented as precision.
- The internal result is never rounded. Swap and shared links use the full
  value; only the display is rounded.

Scientific calculators call this FIX mode with a scientific fallback. The
label is "Decimals" rather than "FIX" because people who do not know calculator
modes still understand decimals.

## Things that look like bugs and are not

**Stepping past a point changes nothing.** Three legitimate reasons:

- The float cap. `1 au to m` has 12 digits before the point, so only 3 fit
  after it. Positions 4 to 15 show the same thing.
- Exact results. `1 mi to km` is exactly `1.609344`, so nothing past 6
  decimals can appear.
- Whole numbers. `2,000 m` never grows decimals.

**Do not "fix" this** by disabling the + button when it would have no effect,
or by making the readout show the effective decimals instead of the chosen
setting. Both were considered and rejected: a control that enables, disables,
or changes its displayed value as you type is worse than a dead zone. The
setting is a stable preference, like FIX on a calculator. It persists across
results and the display simply uses as much of it as the number can carry.

**Small results keep more digits than the setting says.** `0.00123` at 2
decimals shows `0.00123`. This is the rule working, not a leak.

## Plumbing

- `significantDigitsFor(value, decimals)` and `formatDecimals(...)` live in
  `src/conversion.js`. `formatValue(...)` still takes significant digits and is
  used internally for full-precision swaps and query echoes. Do not merge them.
- The setting is stored under `humanunits:decimals:v1` and shared in links as
  `d`. The old `p` parameter and `humanunits:precision:v1` key are ignored on
  purpose, so links and settings from the significant-digit era fall back to
  the default instead of being misread. A link with no `d` must use the
  default; note that `Number(null)` is 0, which is a valid setting now.
- Result font-size presets key off the length of the displayed number, not the
  setting, because 15 decimals on `2,000` is still short.

## Tests that guard this

- `src/conversion.test.js`: "maps decimals to significant digits by
  magnitude", "formats decimals plainly ... never rounds small results to
  zero", and "applies decimals to the inches and the seconds".
- `tests/app.spec.js`: the shared-link test drives the stepper to 15 and
  checks `d` in the URL; the offline test checks the default of 3 decimals.
- `docs/manual-regression-checklist.md` has the hands-on cases.

If a change makes any of these expectations feel wrong, re-read the rule above
before editing the expectation.
