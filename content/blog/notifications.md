---
title: Get a notification when your Growatt battery needs you
description: Kelpwatt can now send a notification to your phone or computer when automatic charging stops working, an export finishes, or someone logs in to your account, plus a morning summary of last night's charging.
date: 2026-10-16
---

[Kelpwatt](https://kelpwatt.angelov.uk) does a lot while you're not looking: it checks your Growatt battery every 5 minutes, follows your car's Intelligent Octopus slots, and runs your evening export. Until now, the only way to know how that went was to open the **Activity** page.

Now Kelpwatt can tell you. Turn on notifications and your phone or computer shows a message when something needs you, and tapping it opens the Activity page.

## What you can be notified about

You choose which kinds you want. All are ticked to start with.

- **Problems:** automatic charging stopped working (for example because Growatt refused your saved login) or started working again, Automatic export didn't run, or Kelpwatt couldn't turn off or put back your export times. These are only sent for things Kelpwatt did on its own: if a button you just pressed fails, you'll already see it on screen.
- **Morning charging summary:** one message after 07:00 saying how last night went, for example _"Battery at 90% · your 23:30–05:30 window, plus Octopus slots 01:00–02:30"_. If a check failed overnight, it says so. You only get this with **Automatic charging** on.
- **Automatic export:** whether tonight's export started, with its times and battery levels, or why it was skipped (your car was plugged in, the battery was too low, and so on).
- **Exports finished:** when an **Export until battery %** ends, whether you started it yourself or Automatic export did.
- **Security:** logins, password and two-step login changes, saved or removed Growatt and Octopus details, and data downloads. These are sent even when you did it yourself, so you'd notice straight away if it wasn't you.

Kelpwatt deliberately doesn't notify you each time automatic charging adds a slot to your inverter. On a night with the car plugged in that can happen several times, so the morning summary covers it in one message.

## Turn it on

1. Open Kelpwatt on the phone or computer you want notifications on. On a phone, [install it as an app first](https://kelpwatt.angelov.uk/blog/install-app): notifications then show with Kelpwatt's name and icon, and on an iPhone they only work that way.
2. Go to **Settings → Notifications**.
3. Turn on **Notifications on this device**, and press **Allow** when your browser or phone asks.
4. Under **Notify me about**, untick anything you don't want.

The switch is for **this device only**, so turn it on on each phone or computer you want notifications on, and off on any you don't. The ticks under **Notify me about** are saved to your account and apply to every device.

Logging out turns notifications off on that device, so a shared computer doesn't keep getting your messages.

### If it says notifications are blocked

You (or your browser) said no to notifications for Kelpwatt earlier. Allow them in your browser's site settings for kelpwatt.angelov.uk, or on Android in **Settings → Apps → Kelpwatt → Notifications**, then come back to **Settings → Notifications**.

### If nothing arrives

- Check your phone or computer isn't in Do Not Disturb or Focus mode.
- On Windows, check notifications are turned on for your browser in **Settings → System → Notifications**.
- Notifications usually arrive within a minute or two of the entry appearing on the Activity page.

## How it works, and your privacy

When you turn notifications on, your browser gives Kelpwatt a push address for that device. It belongs to your browser's push service: Google for Chrome and Android, Apple for Safari and iPhone, Mozilla for Firefox, or Microsoft for Edge on Windows. Kelpwatt sends each message to that service, which delivers it to your device.

- Messages are encrypted end-to-end, so the push service can't read them.
- Kelpwatt doesn't keep the messages. If your device is off for more than 12 hours, the ones it missed are dropped. Everything is still on the Activity page.
- A new message replaces the previous one of the same kind, so your notifications don't fill up with old ones.
- The push address is deleted when you turn notifications off, log out on that device, or delete your account.

The [privacy notice](https://kelpwatt.angelov.uk/privacy) has the details.

_Kelpwatt isn't affiliated with Growatt or Octopus Energy._
