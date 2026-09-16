import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { AppHeader } from "@/components/pangisa/app-header";

const pages = {
  about: {
    title: "About Pangisa",
    description: "Pangisa helps people in Uganda find and share homes directly, with clearer information and fewer unnecessary middlemen.",
    sections: [
      ["What we do", "Pangisa connects tenants with property owners and property owners with genuine tenants. Listings can include area details, rent, photos, amenities, and a location pin so people can make better decisions before visiting."],
      ["How the service works", "Property owners create a listing and pay the applicable listing fee before it goes live. Tenants can browse available homes and may pay for access to protected contact or location details where the listing offers that service."],
      ["Our responsibility", "We provide the platform and tools. Users are responsible for the accuracy of information they submit, the agreements they make, and the homes or services they offer or accept."],
    ],
  },
  terms: {
    title: "Terms of Service",
    description: "The basic rules for using Pangisa listings, accounts, referrals, payments, and platform services.",
    sections: [
      ["Accounts", "You must provide accurate information, protect your login details, and use one account for yourself. We may restrict accounts involved in fraud, impersonation, abuse, or repeated violations."],
      ["Listings and rentals", "Owners must only publish properties they are authorised to list. Listing information must be truthful and current. Pangisa is not a party to a tenancy, sale, payment arrangement, or dispute between users."],
      ["Fees and access", "Platform fees are shown before the relevant action is completed. A fee may cover publication, access to protected information, or another clearly identified Pangisa service. Payment does not guarantee a tenancy, viewing, or successful transaction."],
      ["Referrals", "Referral earnings are subject to the referral rules shown in the account area. Withdrawal requests are reviewed before payment and may be rejected where activity is invalid, reversed, fraudulent, or incomplete."],
      ["Changes", "We may update these terms as the service develops. Continued use after an update means you accept the revised terms."],
    ],
  },
  privacy: {
    title: "Privacy Policy",
    description: "How Pangisa uses account, listing, location, payment, and referral information.",
    sections: [
      ["Information we collect", "We may collect account details, contact information, listing content, property photos, approximate or exact location information supplied for a listing, payment references, referral activity, withdrawal details, and technical information needed to keep the service secure."],
      ["How we use it", "We use information to provide accounts, publish and display listings, process platform services, prevent abuse, support users, review withdrawals, improve the product, and comply with legal obligations."],
      ["Who may see it", "Public listing information is shown according to the listing settings. Protected information may be shared with an authorised user after the relevant service is completed. We may share information with service providers that help operate authentication, storage, payments, analytics, and security."],
      ["Your choices", "You may request correction or deletion of information where applicable. Some records may need to be retained for security, legal, accounting, or dispute-resolution purposes."],
      ["Security", "We use access controls and reasonable technical safeguards, but no online service can guarantee absolute security. Do not share passwords, payment PINs, or sensitive documents through public listing fields."],
    ],
  },
  disclaimer: {
    title: "Disclaimer",
    description: "Important limits on Pangisa's role in property listings and user-to-user transactions.",
    sections: [
      ["Information is user-provided", "Pangisa does not independently guarantee every rent amount, photo, amenity, ownership claim, address, availability statement, or identity shown in a listing. Verify details before paying or signing anything."],
      ["No tenancy guarantee", "A listing or contact-access payment does not guarantee that a property is available, suitable, safe, legally compliant, or ultimately let to you."],
      ["Use care", "Visit properties safely, meet in appropriate public settings where possible, confirm the owner's authority, inspect the property, and use written agreements. Never send money solely because a listing appears on Pangisa."],
      ["Referrals and withdrawals", "Referral amounts and withdrawals depend on qualifying activity, platform records, and review. Processing or display of a balance is not a promise that funds are immediately payable."],
      ["Contact", "If you spot inaccurate, suspicious, or abusive content, report it through the account or support channel available in the app so it can be reviewed."],
    ],
  },
} as const;

type InfoPage = keyof typeof pages;

export const Route = createFileRoute("/public-info")({
  head: ({ params }) => {
    const page = pages[params.page as InfoPage] ?? pages.about;
    return { meta: [{ title: `${page.title} — Pangisa` }, { name: "description", content: page.description }] };
  },
  component: PublicInfoPage,
});

function PublicInfoPage() {
  const { page: pageParam } = Route.useParams();
  const page = pages[pageParam as InfoPage] ?? pages.about;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title={page.title} back />
      <main className="mx-auto max-w-2xl px-4 pb-14 pt-8 sm:px-6">
        <div className="mb-8 rounded-2xl border border-primary/15 bg-primary-soft/40 p-5">
          <div className="mb-3 flex items-center gap-2 text-primary">
            <ShieldCheck className="size-5" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-[0.16em]">Pangisa information</span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{page.title}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{page.description}</p>
        </div>
        <div className="space-y-7">
          {page.sections.map(([heading, body]) => (
            <section key={heading} className="space-y-2">
              <h2 className="font-display text-lg font-semibold">{heading}</h2>
              <p className="text-sm leading-7 text-muted-foreground">{body}</p>
            </section>
          ))}
        </div>
        <nav aria-label="Pangisa information pages" className="mt-10 grid gap-2 border-t border-border pt-6 sm:grid-cols-2">
          {Object.entries(pages).map(([key, value]) => (
            <Link key={key} to="/info/$page" params={{ page: key }} className="group flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm hover:border-primary/40 hover:bg-muted">
              <span>{value.title}</span>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}
