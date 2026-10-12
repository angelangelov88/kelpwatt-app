---
title: Charge and export your Growatt battery from one page
description: Set your Growatt battery's grid charging (Battery First) and grid export (Grid First) times in a few clicks, keep your export times every day, and use presets for your usual export.
date: 2026-10-12
---

Changing charge and export times in the ShinePhone app or on Growatt's website takes a lot of taps, and the export times disappear every night. [Kelpwatt](https://kelpwatt.angelov.uk), a free web app, puts both on one dashboard, and works with just your Growatt account. You don't need Octopus for anything in this guide.

## Charge battery (Battery First)

The **Charge battery** card on Kelpwatt's dashboard shows when your battery charges from the grid. Use it for cheap-rate hours.

1. Press **Load** to read what's on your inverter now.
2. Change what you need:
   - **Charge rate %:** how fast it charges.
   - **Stop at battery %:** the level where charging stops.
   - **Slots:** up to 6 charge times. Use **+ Add Slot** to add one, or **Remove** to delete one.
3. Press **Apply charge times**.

Nothing changes on your inverter until you press **Apply charge times**. Kelpwatt then reads the inverter again to check the change was saved.

### Apply my settings

Save your usual charge power, stop level and (optionally) a nightly window under **Settings → Battery charging settings**. Then **Apply my settings** fills them in with one press:

- **With your own window:** it fills in your times, power and stop level.
- **Without a window:** it sets your power and stop level, and keeps the times on your inverter.

Check the result, then press **Apply charge times**.

If you use [automatic charging with Intelligent Octopus](https://kelpwatt.angelov.uk/blog/ev-intelligent-octopus), Kelpwatt sets these times for you, and this card only shows them.

## Export to grid (Grid First)

The **Export to grid** card shows when your battery powers your home and sends what's left to the grid. Use it when exporting pays well.

1. Press **Load**.
2. Pick a **Discharge rate %** (how fast the battery sends power out) and a **Stop at battery %** (where it stops).
3. Add or change the slots.
4. Press **Apply export times**.

**Disable All** removes every export time, so the battery won't export.

### Presets for your usual exports

The two preset buttons fill in the card with a saved time, power and stop level. The first time you use them they're:

- **High Export:** 18:00–19:00, 95%, stop at 20%.
- **Low Export:** 20:00–22:15, 60%, stop at 15%.

Rename and change them under **Settings → Export to grid presets**. A preset only fills in the card: press **Apply export times** to send it to your inverter.

## Keep your export times every day

Growatt clears your inverter's export times every night at **23:30**. If you export at the same times every day, you'd have to set them again every day.

Turn on **Settings → Export to grid settings → Export every day** instead. A few minutes after 23:30, Kelpwatt puts back the export times you last applied on the dashboard.

- When you turn it on, it keeps the export times already on your inverter.
- An export time that runs across 23:30 pauses for about 5 minutes while they're put back.

## Export only until the battery reaches a level

An export slot set by time alone has a problem. If the battery runs down before the slot ends, the inverter stays in Grid First and your home runs from the grid for the rest of it.

The **Export to grid until battery %** card works out an end time from your battery level instead. It can run automatically every evening too. See [Export to the grid until your battery reaches a set level](https://kelpwatt.angelov.uk/blog/export-until-battery).

## Check what happened

Every change you apply, and everything Kelpwatt does for you, is listed on the **Activity** page.

New here? Start with [Getting started](https://kelpwatt.angelov.uk/blog/getting-started).

**Try it on your own battery:** Kelpwatt is free, and you only need your Growatt login to start. [Create an account](https://kelpwatt.angelov.uk/signup).

_Kelpwatt isn't affiliated with Growatt or Octopus Energy._
