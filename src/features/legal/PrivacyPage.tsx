import { Link } from "react-router";
import ContactLink from "./ContactLink";
import LegalPage from "./LegalPage";
import LegalSection from "./LegalSection";
import { OPERATOR, SITE } from "./legalInfo";

// Keep in step with the code: if the app starts collecting something new,
// keeps it longer or sends it somewhere new, this page must say so.
const PrivacyPage = () => (
  <LegalPage title="Privacy notice">
    <p>
      This notice explains what personal data Kelpwatt ({SITE}) collects, why,
      who it&apos;s shared with and the rights you have. In short: we collect
      only what the app needs to work, we never sell it or use it for
      advertising, and you can download or delete it at any time from Settings.
    </p>

    <LegalSection title="Who we are">
      <p>
        Kelpwatt is a personal, non-commercial project run by {OPERATOR}, who is
        the data controller for the personal data described here. For any
        question about your data, or to use your rights, email <ContactLink />.
      </p>
    </LegalSection>

    <LegalSection title="What we collect">
      <ul className="list-disc pl-5 flex flex-col gap-2">
        <li>
          <strong className="text-gray-100">Your account:</strong> your email
          address and your password (stored only as a secure hash by our login
          provider; we never see it). If you sign in with Google, Google shares
          your name, email address, profile picture link and Google account ID.
          If you turn on two-step verification, the secret for your
          authenticator app.
        </li>
        <li>
          <strong className="text-gray-100">
            Your Growatt and Octopus details:
          </strong>{" "}
          your Growatt username and password (kept in the hashed form
          Growatt&apos;s login uses), your inverter&apos;s serial number, your
          Octopus API key and account number, and when we last checked they
          work. The username, password and API key are encrypted before
          they&apos;re stored and are never shown again, not even to you.
        </li>
        <li>
          <strong className="text-gray-100">Your settings:</strong> your charge
          window and whether it&apos;s used, charge power, battery stop level
          and whether automatic charging is on, your Automatic export settings
          (whether it&apos;s on, its time, discharge rate, stop level and
          minimum battery level), and the theme you chose (light, dark or your
          device&apos;s setting).
        </li>
        <li>
          <strong className="text-gray-100">Automatic charging status:</strong>{" "}
          if you turn automatic charging on, the charge times, power and stop
          level last set on your inverter, when it was last checked and last
          changed, and why the last check failed, if it did. We keep these so we
          only change your inverter when your plan changes. If you turn
          Automatic export on, the last day it ran and why tonight&apos;s last
          try failed, if it did, so it runs at most once an evening.
        </li>
        <li>
          <strong className="text-gray-100">An activity log:</strong> a record
          of important actions on your account, with the time and the IP address
          they came from: logging in (and how: password, Google or an email
          link), changing your password, turning two-step verification on or
          off, saving, removing or failing to verify your Growatt or Octopus
          details, saving settings, changes sent to your inverter, saving
          sessions you join, automatic charging checks that changed your
          inverter, started failing or started working again, each
          evening&apos;s Automatic export (when it started or why it was
          skipped, with your battery level at the time), and downloads of your
          data. It never contains passwords or keys. You can read it on the
          Activity page.
        </li>
        <li>
          <strong className="text-gray-100">Messages you send us:</strong> if
          you use the contact form, your name, email address and message. They
          go straight to our inbox and aren&apos;t stored by the app.
        </li>
        <li>
          <strong className="text-gray-100">Technical data:</strong> to stop
          abuse, we count requests per IP address and per account. The counters
          hold a one-way hash, not the address itself, and are deleted within a
          day. Our hosting providers also log requests, including IP addresses,
          for a short time.
        </li>
      </ul>
      <p>
        To show your dashboard and plan charging, the app also fetches your
        inverter&apos;s charge settings from Growatt and your planned charging
        times and saving sessions from Octopus. With automatic charging on, it
        fetches your planned charging times every 5 minutes. These are fetched
        when needed and not stored, apart from what the activity log and the
        automatic charging status record.
      </p>
    </LegalSection>

    <LegalSection title="Why we use it">
      <ul className="list-disc pl-5 flex flex-col gap-2">
        <li>
          <strong className="text-gray-100">To provide the app</strong> (UK
          GDPR: performance of a contract): creating and securing your account,
          connecting to Growatt and Octopus for you, applying your charge
          settings, running automatic charging if you turn it on, and sending
          emails about your account (confirming your address, resetting your
          password).
        </li>
        <li>
          <strong className="text-gray-100">To answer your messages</strong>{" "}
          (legitimate interests): replying to what you send through the contact
          form.
        </li>
        <li>
          <strong className="text-gray-100">To keep the app secure</strong>{" "}
          (legitimate interests): the activity log, rate limits and IP addresses
          help us spot and stop misuse, and help you see what happened on your
          account.
        </li>
      </ul>
      <p>
        We don&apos;t send marketing emails, show ads, use analytics or
        tracking, or sell or share your data for anyone else&apos;s purposes.
      </p>
    </LegalSection>

    <LegalSection title="Cookies">
      <p>
        We use only cookies that are strictly necessary for signing in: the
        cookies that keep you signed in, and a short-lived one (at most 10
        minutes) used during Google sign-in. Scripts on the page can&apos;t read
        them. There are no analytics or advertising cookies, so there&apos;s
        nothing to accept or decline. Your browser also keeps a copy of your
        theme (light, dark or your device&apos;s setting), so pages open in it
        before you sign in.
      </p>
    </LegalSection>

    <LegalSection title="Who we share it with">
      <p>
        We use these providers to run the app. They process data only on our
        instructions or, for Growatt, Octopus and Google, because you asked us
        to connect to them.
      </p>
      <ul className="list-disc pl-5 flex flex-col gap-2">
        <li>
          <strong className="text-gray-100">Supabase</strong>: sign-in and our
          database, stored in London.
        </li>
        <li>
          <strong className="text-gray-100">Vercel</strong>: hosts the website;
          the server code runs in London.
        </li>
        <li>
          <strong className="text-gray-100">Resend</strong>: delivers our
          account emails and contact form messages.
        </li>
        <li>
          <strong className="text-gray-100">Google</strong>: only if you choose
          to sign in with Google.
        </li>
        <li>
          <strong className="text-gray-100">Growatt</strong>: we sign in to your
          Growatt account and read or change your inverter&apos;s settings.
          Growatt is based in China and its servers may be outside the UK.
        </li>
        <li>
          <strong className="text-gray-100">Octopus Energy</strong>: we use your
          API key to read your planned charging times and saving sessions, and
          to join a session when you ask.
        </li>
      </ul>
      <p>
        Growatt, Octopus and Google each have their own privacy policies for the
        data they hold about you. Some of our providers are based in the USA.
        Where your data leaves the UK, it&apos;s protected by the safeguards UK
        law requires, such as the UK–US Data Bridge or the UK&apos;s
        International Data Transfer Addendum. We may also disclose data if the
        law requires it.
      </p>
    </LegalSection>

    <LegalSection title="How long we keep it">
      <ul className="list-disc pl-5 flex flex-col gap-2">
        <li>
          Your account, settings, automatic charging status and Growatt and
          Octopus details: until you remove them or delete your account.
        </li>
        <li>
          The activity log: 12 months, then entries are deleted automatically.
        </li>
        <li>Rate-limit counters: one day.</li>
        <li>
          Contact form messages: in our inbox for as long as we need them to
          help you, and no longer than 12 months.
        </li>
      </ul>
      <p>
        Deleting your account removes all of it from our database straight away.
        Copies in our providers&apos; backups and logs are removed on their
        normal schedules.
      </p>
    </LegalSection>

    <LegalSection title="How we protect it">
      <p>
        Everything travels over HTTPS. Your Growatt and Octopus secrets are
        encrypted with AES-256, with the key kept apart from the database. Your
        browser never holds a token or a secret: you stay signed in with cookies
        that scripts can&apos;t read. The database can only be reached by our
        server, and each request can only reach its own user&apos;s data. You
        can add two-step verification in Settings.
      </p>
    </LegalSection>

    <LegalSection title="Your rights">
      <p>Under UK data protection law you have the right to:</p>
      <ul className="list-disc pl-5 flex flex-col gap-2">
        <li>
          get a copy of your data: use <em>Download your data</em> in{" "}
          <Link to="/settings" className="text-violet-400 hover:underline">
            Settings
          </Link>
          , which also gives it to you in a reusable format;
        </li>
        <li>
          have it deleted: use <em>Delete account</em> in Settings;
        </li>
        <li>have it corrected, for example your email address;</li>
        <li>object to, or ask us to limit, how we use it.</li>
      </ul>
      <p>
        For anything the app can&apos;t do itself, email <ContactLink />. We
        reply within one month. If you&apos;re unhappy with how we&apos;ve
        handled your data, you can complain to the Information
        Commissioner&apos;s Office (ICO) at{" "}
        <a
          href="https://ico.org.uk/make-a-complaint/"
          target="_blank"
          rel="noreferrer"
          className="text-violet-400 hover:underline"
        >
          ico.org.uk
        </a>
        .
      </p>
    </LegalSection>

    <LegalSection title="Children">
      <p>
        The app is for adults who manage their own home energy system. It&apos;s
        not meant for anyone under 18.
      </p>
    </LegalSection>

    <LegalSection title="Changes to this notice">
      <p>
        If we change this notice, we&apos;ll update the date at the top. If a
        change affects how we use your data, we&apos;ll email you before it
        takes effect.
      </p>
    </LegalSection>
  </LegalPage>
);

export default PrivacyPage;
