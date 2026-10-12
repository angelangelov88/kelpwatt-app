import { Link } from "react-router";

// The blog, about, contact, privacy and terms links at the bottom of every
// page.
const LegalLinks = () => (
  <nav
    aria-label="About and legal"
    className="flex justify-center gap-4 text-xs text-gray-500"
  >
    <Link to="/blog" className="hover:text-gray-300 hover:underline">
      Blog
    </Link>
    <Link to="/about" className="hover:text-gray-300 hover:underline">
      About
    </Link>
    <Link to="/contact" className="hover:text-gray-300 hover:underline">
      Contact
    </Link>
    <Link to="/privacy" className="hover:text-gray-300 hover:underline">
      Privacy
    </Link>
    <Link to="/terms" className="hover:text-gray-300 hover:underline">
      Terms
    </Link>
  </nav>
);

export default LegalLinks;
