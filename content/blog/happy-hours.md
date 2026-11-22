---
title: Charge your Growatt battery in Octopus happy hours, and empty it first
description: Book Octopus's weekend happy hours in Kelpwatt, then let it charge your Growatt battery during them and export just enough beforehand for the happy hour to fill it back up.
date: 2026-11-22
---

Octopus's weekend happy hours give you free or cheap electricity for an hour, booked in advance with tokens. With a home battery, you want two things from one:

- the battery charging during it, not sitting full while the free energy goes by, and
- room in the battery when it starts. A battery that's already at 95% can only take in 5%.

Doing both by hand means changing your Growatt charge and export times before each happy hour, then putting them back afterwards. [Kelpwatt](https://kelpwatt.angelov.uk) is a free web app for Growatt home batteries, and it can now do all of that for you.

## Before you start

You need:

- your **Growatt login** and **Octopus API key** saved in Kelpwatt. [Getting started](https://kelpwatt.angelov.uk/blog/getting-started) shows how.
- **Automatic charging** turned on in **Settings → Automatic charging**. Its 5-minute check is what changes your inverter. [Automatic charging on Intelligent Octopus](https://kelpwatt.angelov.uk/blog/ev-intelligent-octopus) shows how.
- for the export, your **battery size** and **max discharge power** under **Settings → Your battery**. Kelpwatt uses them to work out how much a happy hour can charge back.

## Book a happy hour

Once your Octopus details are saved, the dashboard has a **Happy Hours** card:

1. Press **Load**. Kelpwatt gets the upcoming happy hours in your region and your token balance from Octopus.
2. Press **Book** next to the one you want. It shows the cost in tokens and asks you to confirm.
3. Changed your mind? Press **Cancel**. You can cancel until the happy hour starts.

**Book** only shows when there's a place left and you have enough tokens. Octopus normally lets you book 2 happy hours a weekend, so Book is turned off once you have.

Open **Show happy hour history** to see the ones you booked, with the electricity you used and any credit. Octopus can take a few days to add these.

## Charge during happy hours

Under **Settings → Happy hours**, turn on **Charge during happy hours** and choose:

- **Charge rate:** how hard to charge, like your other charge times.
- **Charge up to:** the battery level to stop at.

Then press **Save happy hour settings**.

30 minutes before each happy hour you booked, Kelpwatt adds it to your inverter's charge times, with this rate and level. When it ends, Kelpwatt takes it off again. Your usual charge window and any Intelligent Octopus slots aren't touched.

## Export before happy hours

Charging only helps if the battery has room. Turn on **Export before happy hours** (it needs charging on) and choose:

- **Discharge rate:** how hard to export.
- **Never below:** the lowest the export will take the battery.
- **Only run if battery is at least:** a minimum level, which must be above **Never below**. If the battery is already low, there's nothing worth exporting.

Before each happy hour, Kelpwatt reads your battery level and sets one export that **ends the minute the happy hour starts**. It exports just enough for the happy hour to charge back, never more.

### How far it exports

Kelpwatt works out what the happy hour can put back: your charge rate × your max discharge power × the length of the happy hour. It only counts on 90% of that, because your battery details are estimates and charging slows near full.

For example, with a 10 kWh battery, a max discharge power of 3 kW, a 100% charge rate and **Charge up to** 100%:

- **A 1-hour happy hour** can charge about 3 kW × 1 hour × 90% = 2.7 kWh, or 27% of the battery. Kelpwatt exports down to **73%**.
- **Two back-to-back happy hours** count as one 2-hour one. That's about 5.4 kWh, or 54%, so it exports down to **46%**.

It never goes below your **Never below** level, whatever the sums say. The settings page shows what a 1-hour happy hour would mean with your own settings.

### Your own export times

While it runs, that export replaces your other export times for the day. Once it ends, Kelpwatt puts yours back, apart from any that fall during a happy hour. You don't want the battery exporting the free energy it's just taken in.

### When it skips one

The export doesn't run before a happy hour if:

- the battery is below your minimum,
- the battery is already low enough to fill up during it,
- the export would last less than 5 minutes,
- an **Export to grid until battery %** you started is still running,
- your car is plugged in. Kelpwatt counts it as plugged in when Intelligent Octopus has charging planned, so your battery doesn't export while the car needs cheap power, or
- no check got to it in time before the happy hour.

If Growatt or Octopus doesn't answer, it tries again at the next 5-minute check.

## If you cancel or Octopus moves a happy hour

Kelpwatt reloads your bookings at every check, so:

- **Charging** follows the change. A cancelled happy hour's charge times come off the inverter, or never go on.
- **An export already running** for a happy hour that's been cancelled or moved stops within 5 minutes, and your own export times come back.
- **If you cancel one of two back-to-back happy hours,** the export carries on, but now stops at a higher level. One hour can only charge back half as much.

If Octopus doesn't answer, Kelpwatt keeps charging in the happy hours it last loaded. One missed reply doesn't take them off your inverter.

## See what it did

Everything shows on the **Activity** page:

- **Booked a happy hour** and **Cancelled a happy hour booking.**
- Automatic charging's entries list the happy hour times they added, for example _happy hour 13:00–14:00_.
- **Happy hour export set**, with the export time, the battery level it started from and where it stops.
- **Happy hour export skipped**, with the reason, for example _The battery was at 42%, below your 50% minimum_.
- **Happy hour export stopped** or **shortened**, if the happy hour was cancelled or moved.

If you've [turned on notifications](https://kelpwatt.angelov.uk/blog/notifications), the export starting or being skipped comes under **Automatic export**, and anything that needs you comes under **Problems**.

## Pairs well with

- [Automatic charging on Intelligent Octopus](https://kelpwatt.angelov.uk/blog/ev-intelligent-octopus), which charges the battery in your car's cheap slots too.
- [Export until battery %](https://kelpwatt.angelov.uk/blog/export-until-battery), the same export by battery level, for any evening.

**Try it on your own battery:** Kelpwatt is free. [Create an account](https://kelpwatt.angelov.uk/signup), add your Growatt and Octopus details, and book your next happy hour from the dashboard.

_Kelpwatt isn't affiliated with Growatt or Octopus Energy._
