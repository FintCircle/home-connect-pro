import { createFileRoute, redirect } from "@tanstack/react-router";

/** Old region page — redirects to the new location URL. */
export const Route = createFileRoute("/browse/$regionSlug")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/homes/$", params: { _splat: params.regionSlug }, replace: true });
  },
});
