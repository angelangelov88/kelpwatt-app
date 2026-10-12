---
title: "Getting started with Kelpwatt: connect your Growatt battery and Octopus account"
description: Create an account, add your Growatt login and (optionally) your Octopus API key, and set up your battery details in about ten minutes.
date: 2026-10-12
---

Kelpwatt is a free web app that puts your Growatt home battery and your Octopus Energy account on one page. It can set your battery's charge and export times for you, follow the cheap charging slots Intelligent Octopus plans for your car, and export to the grid until your battery reaches a level you choose.

This guide takes you from a new account to a working dashboard.

## What you need

- A Growatt inverter and battery that you can see in the ShinePhone app or on server.growatt.com.
- Your Growatt username, password and inverter serial number.
- Optional: an Octopus Energy account, if you want automatic charging around your car's charging slots and saving sessions.

## 1. Create your account

1. Go to [Create an account](/signup).
2. Sign up with Google, or with your email and a password. The password needs at least 10 characters, with upper and lowercase letters, a number and a symbol.
3. If you used email, open the link we send you to finish creating your account.

## 2. Add your Growatt login

The dashboard shows **Finish setting up** until this is done, because Kelpwatt can't read or change your inverter without it.

1. Open **Settings** and scroll to **Growatt and Octopus**.
2. Add your Growatt details:
   - **Growatt username:** the one you use for the ShinePhone app or server.growatt.com.
   - **Growatt password.**
   - **Inverter serial number:** in the ShinePhone app, or on the sticker on the inverter.
3. Press **Check and save**.

Kelpwatt logs in to Growatt and reads your inverter before it saves anything, so you know straight away if a detail is wrong. If Growatt is slow to answer, wait a minute and try again.

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

Growatt doesn't share your battery's size or power, so Kelpwatt asks for them. They're used to work out how long an export can run. In **Settings → Your battery**, add:

- **Battery size (kWh):** the usable capacity from your battery's spec sheet. If you have more than one battery, add them up.
- **Max discharge power (kW):** export at a 100% rate and read the battery discharge power in the Growatt app. If you can only test at 95%, divide what it shows by 0.95.

## 5. Choose your battery charging settings

In **Settings → Battery charging settings**, pick:

- **Charge power:** how much of the inverter's power to charge from the grid with.
- **Stop at battery:** the level where grid charging stops.
- **Charge in my own window** (optional): a fixed nightly window, for example 23:30–05:30.

These fill in the dashboard's **Apply my settings** button. With Octopus, automatic charging uses them too.

## What's next

- [Stop your battery emptying into your EV on Intelligent Octopus](/blog/ev-intelligent-octopus)
- [Charge and export your Growatt battery from one page](/blog/growatt-import-export)
- [Export to the grid until your battery reaches a set level](/blog/export-until-battery)

Everything Kelpwatt does on your behalf, including every check that fails, is listed on the **Activity** page.

_Kelpwatt isn't affiliated with Growatt or Octopus Energy._
