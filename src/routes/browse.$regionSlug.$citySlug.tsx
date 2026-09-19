import { createFileRoute, redirect } from "@tanstack/react-router";

/** Old city page — redirects to the new location URL. */
export const Route = createFileRoute("/browse/$regionSlug/$citySlug")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/homes/$",
      params: { _splat: `${params.regionSlug}/${params.citySlug}` },
      replace: true,
    });
  },
});
