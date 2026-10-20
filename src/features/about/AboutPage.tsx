import { Link } from "react-router";
import LegalPage from "../legal/LegalPage";
import LegalSection from "../legal/LegalSection";
import { REPO_URL } from "../../lib/contactInfo";

// Why the app exists and what it does, in the operator's own words.
const AboutPage = () => (
  <LegalPage title="About Kelpwatt" showUpdated={false}>
    <LegalSection title="Why I built it">
      <p>
        For over two years I&apos;ve had an electric car, solar panels, a
        Growatt home battery and Octopus&apos;s Intelligent Octopus Go tariff.
        The tariff has saved me a lot of money, but there was one catch.
      </p>
      <p>
        When I plug the car in, Octopus picks cheap charging slots for it, and
        those slots keep changing. One evening they changed five times between
        7pm and 10pm, and sometimes a slot would move just minutes before it was
        due to start. My Growatt battery knew nothing about any of this. Unless
        I changed its settings by hand before every slot, it emptied itself into
        the car at exactly the moment electricity was cheapest.
      </p>
      <p>
        So I spent evenings switching between the Octopus app and the Growatt
        app, and with several slots a night I couldn&apos;t keep up. In the end
        I stopped using the flexible slots altogether: I plugged the car in as
        late as possible and only charged in the fixed 23:30–05:30 window. That
        protected my battery, but I was missing out on much of what the tariff
        offers.
      </p>
      <p>
        I asked Octopus whether slots could stay fixed once set, or whether they
        could work with Growatt batteries. Neither was possible, so I built the
        connection myself.
      </p>
    </LegalSection>

    <LegalSection title="What it does">
      <p>
        Kelpwatt connects your Growatt SPH inverter to your Octopus account.
        Other Growatt inverters, such as the MIN, MOD and SPA, aren&apos;t
        supported yet.
      </p>
      <ul className="list-disc pl-5 flex flex-col gap-2">
        <li>
          <strong className="text-gray-100">
            See everything in one place:
          </strong>{" "}
          your battery&apos;s charge settings next to the slots Octopus has
          planned for your car.
        </li>
        <li>
          <strong className="text-gray-100">Automatic charging:</strong>{" "}
          Kelpwatt checks your Octopus slots every 5 minutes. When they change,
          it sets your battery to charge from the grid during each slot, so it
          fills up cheaply instead of draining into the car. If nothing has
          changed, it leaves your inverter alone.
        </li>
        <li>
          <strong className="text-gray-100">Your own window, or not:</strong>{" "}
          keep a fixed overnight charging window, or let Octopus&apos;s slots
          use all six of your inverter&apos;s charge times.
        </li>
        <li>
          <strong className="text-gray-100">Saving sessions:</strong> see
          Octopus&apos;s saving sessions and join them in one click.
        </li>
      </ul>
      <p>
        Now I plug the car in whenever it suits me and let Octopus choose the
        times.
      </p>
      <p>
        The{" "}
        <Link to="/blog" className="text-violet-400 hover:underline">
          blog
        </Link>{" "}
        has step-by-step guides to each of these.
      </p>
    </LegalSection>

    <LegalSection title="Not with Octopus?">
      <p>
        You can use Kelpwatt with just your Growatt account. The dashboard shows
        your battery&apos;s charge and discharge times and lets you change them
        in a few clicks, which is quicker than doing it on Growatt&apos;s own
        website.
      </p>
    </LegalSection>

    <LegalSection title="How it's built">
      <p>
        I&apos;m a front-end developer, and Kelpwatt is a personal project that
        I built and run myself.
      </p>
      <ul className="list-disc pl-5 flex flex-col gap-2">
        <li>
          The website and its server run in London (on Vercel), and your account
          and settings are stored in London too (on Supabase).
        </li>
        <li>
          Your Growatt password and Octopus API key are encrypted before
          they&apos;re saved. They&apos;re only unlocked on the server when
          needed, never shown again and never sent to your browser. More in the{" "}
          <Link to="/privacy" className="text-violet-400 hover:underline">
            privacy notice
          </Link>
          .
        </li>
        <li>
          Growatt doesn&apos;t offer an official way for apps to connect, so
          Kelpwatt talks to it the same way Growatt&apos;s own website does.
        </li>
        <li>
          Kelpwatt is in beta, and open to up to 20 people while I test it.
        </li>
        <li>
          The code is public on{" "}
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="text-violet-400 hover:underline"
          >
            GitHub
          </a>
          .
        </li>
      </ul>
    </LegalSection>

    <LegalSection title="About the name">
      <p>
        Kelpwatt sits between the two services it joins. Kelp is a seaweed that
        grows very fast, a nod to the sea (Octopus) and to growing (Growatt).
        Watt is the unit of power, and the end of Growatt&apos;s name. The logo
        shows energy flowing into a battery (violet) and back out to your home
        or the grid (green).
      </p>
      <p>
        Kelpwatt is independent. It isn&apos;t made or endorsed by Growatt or
        Octopus Energy.
      </p>
    </LegalSection>

    <p>
      Questions or ideas?{" "}
      <Link to="/contact" className="text-violet-400 hover:underline">
        Get in touch
      </Link>
      .
    </p>
  </LegalPage>
);

export default AboutPage;
