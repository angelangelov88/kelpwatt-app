---
title: "Getting started with Kelpwatt: connect your Growatt battery and Octopus account"
description: Create an account, add your Growatt login and (optionally) your Octopus API key, and set up your battery details in about ten minutes.
date: 2026-10-12
---

[Kelpwatt](https://kelpwatt.angelov.uk) is a free web app that puts your Growatt home battery and your Octopus Energy account on one page. It can set your battery's charge and export times for you, follow the cheap charging slots Intelligent Octopus plans for your car, and export to the grid until your battery reaches a level you choose.

This guide takes you from a new account to a working dashboard.

## What you need

- A Growatt SPH inverter and battery that you can see in the ShinePhone app or on server.growatt.com. Other Growatt inverters, such as the MIN, MOD and SPA, aren't supported yet: they use different settings, and Kelpwatt tells you if yours is one of them when you add your Growatt login.
- Your Growatt username, password and inverter serial number.
- Optional: an Octopus Energy account, if you want automatic charging around your car's charging slots and saving sessions.

## 1. Create your account

1. Go to [Create an account](https://kelpwatt.angelov.uk/signup).
2. Sign up with Google, or with your email and a password. The password needs at least 10 characters, with upper and lowercase letters, a number and a symbol.
3. If you used email, open the link we send you to finish creating your account.

## 2. Add your Growatt login

The dashboard shows **Finish setting up** until this is done, because Kelpwatt can't read or change your inverter without it.

1. In Kelpwatt, open **Settings** and scroll to **Growatt and Octopus**.
2. Add your Growatt details:
   - **Growatt username:** the one you use for the ShinePhone app or server.growatt.com.
   - **Growatt password.**
   - **Inverter serial number:** see below.
3. Press **Check and save**.

Kelpwatt logs in to Growatt and reads your inverter before it saves anything, so you know straight away if a detail is wrong. If Growatt is slow to answer, wait a minute and try again.

### Finding your inverter serial number

Your Growatt system has two serial numbers, and it's easy to pick the wrong one. Kelpwatt needs the **inverter's**, not the data logger's (the Wi-Fi or LAN dongle plugged into the inverter).

- **In the ShinePhone app or on server.growatt.com:** open your plant's device list and choose the inverter, not the data logger. The number you want is labelled **Device Serial Number**. The data logger has its own serial number, which won't work.
- **On the inverter itself:** it's on the sticker on the side of the inverter. The dongle has a separate sticker with its own number.

If **Check and save** says it logged in but couldn't read your inverter, check you haven't copied the data logger's number, and that the inverter is online.

## 3. Add your Octopus API key (optional)

Without Octopus, you can still see and change your battery's charge and export times, export until a battery level, and export every day. Add Octopus to see your car's charging slots, charge your battery in them automatically, and join saving sessions.

1. In your Octopus account, go to **Personal details → API access** and copy your API key.
2. In Kelpwatt's **Growatt and Octopus** card, add:
   - **Octopus API key.**
   - **Account number:** it's on your bills, and looks like A-1234ABCD.
3. Press **Check and save**. Kelpwatt checks with Octopus that the key can see that account.

## Confirming it's you

Adding or replacing these details is protected like changing your password. Depending on how you log in, you'll be asked for:

- your Kelpwatt password, or
- a code from your authenticator app, if you've turned on two-step login, or
- a fresh Google login, if you signed up with Google and logged in more than a few minutes ago.

## How your details are kept safe

- Your Growatt password and Octopus API key are encrypted before they're saved.
- They're only unlocked on the server when needed, and never shown again, not even to you.
- Each inverter and each Octopus account can be linked to only one Kelpwatt account. That stops two accounts overwriting each other's settings on the same inverter.

For extra protection, turn on two-step login under **Settings → Authenticator app**.

## 4. Add your battery details

Growatt doesn't share your battery's size or power, so Kelpwatt asks for them. They're used to work out how long an export can run. Add both in **Settings → Your battery**, then press **Save battery details**.

You only need these for **Export to grid until battery %** and **Automatic export**. Everything else works without them.

### Battery size (kWh)

This is how much energy your battery holds when full.

1. Find your battery's model name. It's on the label on the battery itself, and on the invoice or paperwork from your installer.
2. Growatt's model names usually include the size. For example, an ALP 5.0L is 5 kWh, and an APX 10.0P is 10 kWh.
3. Some Growatt batteries, such as the ARK and APX ranges, are made of stacked modules. Multiply one module's size by how many you have. ARK modules are 2.56 kWh each, so a stack of three is 7.68 kWh.
4. If you have more than one battery, add them up.

If the spec sheet gives both a total and a **usable** capacity, use the usable one.

### Max discharge power (kW)

This is how fast your battery empties when it exports at full rate. It's easiest to measure:

1. Pick a time when the battery is well above your stop level.
2. On Kelpwatt's dashboard, in **Export to grid**, press **Load**. Add a slot starting now, set **Discharge rate %** to 100, and press **Apply export times**.
3. After a minute or two, open ShinePhone or server.growatt.com and read the battery's power on the live energy flow diagram.
4. Back in Kelpwatt, press **Disable All**, then **Apply export times**, to stop the export.

If you can only test at 95%, divide what it shows by 0.95. For example, 3.5 kW at 95% is 3.68 kW at 100%.

These are estimates, and that's fine: Kelpwatt ends exports a little early to allow for it. If exports regularly stop well above or below the level you picked, adjust these numbers.

## 5. Choose your battery charging settings

In **Settings → Battery charging settings**, pick:

- **Charge power:** how much of the inverter's power to charge from the grid with. We recommend **60%** rather than the full 100%. Charging more gently is easier on your battery, and over a night it's usually still enough to fill it. If your battery doesn't reach your stop level by the end of the window, raise it a step at a time.
- **Stop at battery:** the level where grid charging stops. We recommend **90%**. It's easier on the battery than charging to 100%, and it leaves a little room for your solar panels the next morning.
- **Charge in my own window** (optional): a window your battery charges in every night. Set it to your tariff's cheap night period, for example 23:30–05:30 on Intelligent Octopus Go, so the battery fills up at the cheapest rate and powers your home through the day.

These fill in the dashboard's **Apply my settings** button. With Octopus, automatic charging uses them too.

## What's next

- [Stop your battery emptying into your EV on Intelligent Octopus](https://kelpwatt.angelov.uk/blog/ev-intelligent-octopus)
- [Charge and export your Growatt battery from one page](https://kelpwatt.angelov.uk/blog/growatt-import-export)
- [Export to the grid until your battery reaches a set level](https://kelpwatt.angelov.uk/blog/export-until-battery)

Everything Kelpwatt does on your behalf, including every check that fails, is listed on the **Activity** page.

_Kelpwatt isn't affiliated with Growatt or Octopus Energy._
