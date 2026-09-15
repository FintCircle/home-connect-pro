import { useUser } from "@clerk/tanstack-react-start";

export function useAuthUser() {
  const { user, isLoaded } = useUser();
  return {
    data: user ?? null,
    isLoading: !isLoaded,
  };
}

export function useProfile() {
  const { data: user } = useAuthUser();
  return {
    data: user
      ? {
          id: user.id,
          full_name: user.fullName,
          avatar_url: user.imageUrl,
          email: user.primaryEmailAddress?.emailAddress ?? null,
          phone: user.primaryPhoneNumber?.phoneNumber ?? null,
        }
      : null,
    isLoading: false,
  };
}
