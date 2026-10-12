---
title: Stop your Growatt battery emptying into your EV on Intelligent Octopus Go
description: Intelligent Octopus moves your car's cheap charging slots around. Kelpwatt follows them every 5 minutes and charges your Growatt battery in them too, so it fills up instead of draining into the car.
date: 2026-10-12
---

If you have an electric car, a Growatt home battery and Intelligent Octopus Go, you've probably seen this: you plug the car in, Octopus gives it a cheap charging slot in the evening, and your home battery happily empties itself into the car at exactly the moment grid power is cheapest.

## Why it happens

When you plug in, Intelligent Octopus plans **dispatch slots**: extra cheap-rate times for charging your car, on top of the usual overnight window. Those slots change. One evening they can move several times between 7pm and 10pm, sometimes just minutes before they're due to start.

Your Growatt inverter knows nothing about them. Unless its **Battery First** charge times match each slot, the battery powers the house, and the car, from what it stored. Keeping up by hand means switching between the Octopus and Growatt apps every time a slot moves.

## What Kelpwatt does

Kelpwatt connects your Octopus account to your Growatt inverter and does that switching for you.

- **Checks your Octopus slots every 5 minutes.**
- **Sets your battery to charge from the grid during each slot**, so it charges at the cheap rate instead of draining into the car.
- **Only changes the inverter when something changed:** your slots, or your settings. If nothing moved, your inverter is left alone.

You plug the car in whenever it suits you and let Octopus choose the times.

## Set it up

You'll need a Kelpwatt account with your Growatt login and your Octopus API key saved. [Getting started](/blog/getting-started) walks through it.

1. Open **Settings → Battery charging settings** and choose:
   - **Charge power:** how much of the inverter's power to charge from the grid with.
   - **Stop at battery:** the level where grid charging stops.
   - **Charge in my own window:** see below.
2. Press **Save battery charging settings**.
3. In **Settings → Automatic charging**, turn on **Apply my Octopus slots to the inverter**.

That's it. Within 5 minutes, the dashboard's Octopus card shows when it last checked and the charge times now on your inverter.

## Your own window, or Octopus's slots only

Your inverter has 6 charge times, and Kelpwatt can use them in two ways.

**With your own window on** (for example 23:30–05:30, the standard cheap overnight rate):

- Your battery charges in that window every night, whatever Octopus plans.
- That window takes one of the 6 charge times, so up to 5 Octopus slots are added.
- Octopus slots inside your window are left out, because the window already covers them. A slot partly inside it is cut to the part outside.

**With your own window off:**

- Only Octopus's slots are used, up to 6 of them.
- With no slots planned, the inverter doesn't charge from the grid.

If Octopus plans more slots than there's room for, the soonest ones are kept.

## Not ready for automatic?

You can do the same by hand. The dashboard's **Octopus Dispatch Slots** card lists the slots Octopus has planned and shows what it will apply. Press the green **Apply Slots to Growatt** button to write them, together with your own window if you use one.

With automatic charging on, that button becomes **Sync now**, which checks straight away. That's handy just after you plug the car in.

## When something goes wrong

- If a check fails (for example, Growatt doesn't answer), the Octopus card says so and it tries again at the next check.
- If Growatt refuses your saved login, for example because you changed your Growatt password, automatic charging pauses so your Growatt account doesn't get locked. Update the login under **Settings → Growatt and Octopus** and it carries on.
- The **Activity** page lists every change Kelpwatt made to your inverter, and every check that failed.

## Saving sessions too

With Octopus connected, the dashboard also shows today's **Power Down sessions**. Join one in a click, see your points, or press **Export during session** to fill in your export times for it. More on exporting in [Charge and export your Growatt battery from one page](/blog/growatt-import-export).

_Kelpwatt isn't affiliated with Growatt or Octopus Energy._
