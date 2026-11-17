# Edge Support Reminder Live Test

Date: 2026-11-17 (Asia/Taipei). Tested local commit `c83253c` using Microsoft Edge on macOS, with the unpacked FocusView 1.1.8 extension loaded from this checkout. The store-installed copy was disabled.

## Method

Used a real YouTube watch page, native keyboard shortcuts to toggle Zoom mode, and actual dialog buttons and external links. Read and seeded only the `supportPrompt` local-storage key through the extension's background DevTools console. Initial boundary checks started at counts 18 and 19; subsequent reminder intervals were exercised through repeated off-to-on UI transitions. No runtime source was replaced or mocked.

## Results

| Scenario | Observed result |
| --- | --- |
| 20-activation interval | No dialog at 19; dialog at 20. |
| Escape dismissal | Dialog closed; no reminder at the next 19 activations, then a reminder at 20. |
| × dismissal | Dialog closed; the next reminder remained at the 20-activation interval. |
| First footer press | No reminder at 59; reminder at 60. |
| Second footer press | No reminder at 99; reminder at 100. |
| Third footer press without a link click | No reminder at 99; reminder at 100; no permanent suppression yet. |
| Coffee link after two footer presses | Ko-fi opened. No reminder at 19; reminder at 20. The next footer press completed permanent suppression, demonstrating that prior footer presses were retained. |
| Link click before the third footer press | After the third footer press, 120 further activations produced no dialog. Stored count stayed zero, footer count was three, and the link-click flag was true. |
| Three footer presses before the link click | The rating destination opened. The next 120 activations produced no dialog. Stored count stayed zero, footer count was three, and the link-click flag was true. |
| Shared counter across tabs | First tab advanced the count to 19; one activation in a second YouTube tab displayed the reminder at 20. |
| Full browser restart | Quit Edge using its application menu, relaunched it, and restored the previous window. Storage retained count 7, interval 60, footer count 1, and link-click flag false. Another 52 activations produced no reminder; the next activation displayed it at 60. |

No reminder-logic failures were observed in these scenarios. The original `supportPrompt` value was restored and verified after testing; additional video, rating, coffee, and extension-management test tabs were closed.

## Scope

This is an Edge live test, separate from the automated Node tests. It does not verify native Safari, completed reviews or payments, simultaneous multi-tab races, storage failures, or permanent suppression across a full browser restart. The rating link was exercised when permanent-suppression conditions were met; the coffee link separately verified the recurring 20-activation reset.
