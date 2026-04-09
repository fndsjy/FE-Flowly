export const isOnboardingExamPath = (pathname: string) =>
  /\/onboarding\/exam\/[^/]+\/?$/.test(pathname);

export default isOnboardingExamPath;
