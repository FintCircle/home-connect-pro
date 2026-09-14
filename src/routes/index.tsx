import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Home, Plus, BarChart3 } from "lucide-react";

import heroImage from "@/assets/hero-kampala.jpg";
import { AppHeader } from "@/components/pangisa/app-header";
import { BottomNav } from "@/components/pangisa/bottom-nav";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pangisa — Find your next home in Uganda" },
      {
        name: "description",
        content:
          "Browse real rentals by region, city and area across Uganda. Talk to genuine landlords directly, no brokers.",
      },
      { property: "og:title", content: "Pangisa — Find your next home in Uganda" },
      {
        property: "og:description",
        content:
          "Browse real rentals by region, city and area across Uganda. Talk to genuine landlords directly, no brokers.",
      },
    ],
  }),
  component: Index,
});

const actions = [
  {
    to: "/browse",
    title: "Find a Home",
    body: "Browse by region, city and district.",
    icon: Home,
    tone: "bg-primary-soft text-primary",
  },
  {
    to: "/list-property",
    title: "List your Property",
    body: "Reach genuine tenants. List directly, no brokers.",
    icon: Plus,
    tone: "bg-accent-soft text-accent",
  },
  {
    to: "/affiliates",
    title: "Funa Sente",
    body: "Refer landlords and tenants. Earn commissions.",
    icon: BarChart3,
    tone: "bg-primary-soft text-primary",
  },
] as const;

function Index() {
  return (
    <div className="min-h-screen pb-20">
      <AppHeader />
      <main className="mx-auto max-w-lg">
        <section className="relative h-64 overflow-hidden">
          <img
            src={heroImage}
            alt="Homes across a Kampala neighbourhood at sunset"
            width={1280}
            height={960}
            className="size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/35 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-background">
            <h1 className="font-display text-3xl font-extrabold leading-tight">
              Find your
              <br />
              next home.
            </h1>
            <p className="mt-2 text-sm opacity-90">
              Real rentals. Real landlords. Across Uganda.
            </p>
          </div>
        </section>

        <section className="space-y-3 p-4">
          {actions.map(({ to, title, body, icon: Icon, tone }) => (
            <Link key={to} to={to} className="surface-card flex items-center gap-3.5 p-4">
              <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${tone}`}>
                <Icon className="size-5" />
              </span>
              <span className="flex-1">
                <span className="block font-display text-[0.95rem] font-semibold">{title}</span>
                <span className="block text-xs text-muted-foreground">{body}</span>
              </span>
              <ArrowRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </section>

        <section className="px-6 py-8 text-center">
          <p className="text-hand text-2xl text-foreground">A better way to rent in Uganda.</p>
          <svg viewBox="0 0 160 12" className="mx-auto mt-1 h-3 w-40 text-accent" fill="none">
            <path
              d="M2 9C40 3 120 2 158 6"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
