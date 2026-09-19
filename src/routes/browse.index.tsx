import { createFileRoute, redirect } from "@tanstack/react-router";

/** Old browse entry point — the place finder now lives at /homes. */
export const Route = createFileRoute("/browse/")({
  beforeLoad: () => {
    throw redirect({ to: "/homes", replace: true });
  },
});
