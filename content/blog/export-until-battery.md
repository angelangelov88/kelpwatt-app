---
title: Export to the grid until your battery reaches a set level, every evening
description: Instead of guessing an export end time, let Kelpwatt work it out from your Growatt battery level, and run it automatically every evening if you like.
date: 2026-10-12
---

Exporting from a Growatt battery by time has a catch. Set the slot too short and you leave paid-for energy in the battery. Set it too long and the battery hits its stop level early. The inverter then stays in Grid First, and your home runs from the grid for the rest of the slot.

[Kelpwatt](https://kelpwatt.angelov.uk) is a free web app for Growatt home batteries. Its **Export to grid until battery %** works the other way round: you pick the level to stop at, and it works out when the battery gets there.

## Before you start

Kelpwatt needs two numbers that Growatt doesn't share. Add them under Kelpwatt's **Settings → Your battery**:

- **Battery size (kWh):** the usable capacity. If you have more than one battery, add them up.
- **Max discharge power (kW):** export at a 100% rate and read the battery discharge power in the Growatt app.

[Getting started](https://kelpwatt.angelov.uk/blog/getting-started) explains both. You only need your Growatt login for this, not Octopus.

## Export once, now

On Kelpwatt's dashboard, in the **Export to grid until battery %** card:

1. Pick a **Discharge rate %** and a **Stop at battery %**.
2. Press **Work out times**. Kelpwatt reads your battery level and shows the plan, for example: _Battery 86% → 20% at 95% discharge rate. Export 21:00–22:14 (1 h 14 min)._ Nothing has changed yet.
3. Press **Confirm** to set it. Kelpwatt works the end time out again from the current time, so a slow click doesn't make it run late.

What happens next:

- That one export time **replaces your other export times for today**.
- Within 5 minutes of it ending, Kelpwatt turns the export off.
- If you use **Export every day**, your usual export times come back after Growatt's 23:30 reset.

### Why it ends a little early

It aims 2% above your stop level and rounds down. Your battery details are estimates, the real power doesn't follow the rate exactly, and Growatt's battery level is a whole number that can be a few minutes old. Ending a few minutes early is better than importing from the grid.

### Limits

- Exports always end before **23:30**, when Growatt clears export times. A plan that would run later is cut short, and the card says so.
- If the battery is already at or close to your stop level, there's nothing to export.
- The worked-out times are offered for 5 minutes. After that, press **Work out times** again.

## Do it automatically every evening

If you export most evenings, turn on **Settings → Automatic export**. Every evening at your chosen time it does what **Work out times** and **Confirm** do: reads your battery level, works out the end time and sets the export.

Choose:

- **Start time:** UK time, up to 23:00. It starts within 5 minutes of this.
- **Discharge rate** and **Stop at battery.**
- **Only run if battery is at least:** a minimum level, which must be above your stop level. On a dull day with a half-empty battery, it doesn't export at all.

Then press **Save automatic export** and turn the switch on.

### When it skips an evening

Automatic export doesn't run that evening if:

- the battery is below your minimum,
- the export would last less than 5 minutes,
- the battery is already at your stop level,
- an export you started by hand is still running, or
- with Octopus connected, your car is plugged in. Kelpwatt counts it as plugged in when Intelligent Octopus has charging planned, so your battery doesn't export while the car needs cheap power. Without Octopus there's no car check.

If Growatt or Octopus doesn't answer, it tries again at each 5-minute check for 30 minutes, then gives up for that evening.

### See what it did

Every run and every skip appears on the **Activity** page:

- **Automatic export started**, with the export time and the battery level it started from.
- **Automatic export skipped**, with the reason. For example: _The battery was at 42%, below your 50% minimum_.

While it's on, the dashboard card also shows when it runs and with which settings.

## Pairs well with

- [Export every day](https://kelpwatt.angelov.uk/blog/growatt-import-export), which puts your usual export times back after 23:30.
- [Automatic charging on Intelligent Octopus](https://kelpwatt.angelov.uk/blog/ev-intelligent-octopus), which fills the battery back up at the cheap rate overnight.

**Try it on your own battery:** Kelpwatt is free, and you only need your Growatt login to start. [Create an account](https://kelpwatt.angelov.uk/signup).

_Kelpwatt isn't affiliated with Growatt or Octopus Energy._
