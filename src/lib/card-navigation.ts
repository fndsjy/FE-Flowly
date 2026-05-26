import type { KeyboardEvent, MouseEvent } from "react";
import type { NavigateFunction, NavigateOptions } from "react-router-dom";
import { getAppRouteHref, isExternalRoute, normalizeAppRoute } from "./routes";

type CardNavigationOptions = {
  route: string;
  navigate: NavigateFunction;
  navigateOptions?: NavigateOptions;
  disabled?: boolean;
  onBlocked?: () => void;
};

const interactiveChildSelector =
  "a,button,input,select,textarea,summary,[data-card-action]";

const isFromInteractiveChild = (
  event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>
) => {
  const target = event.target;
  const currentTarget = event.currentTarget;

  if (!(target instanceof Element) || !(currentTarget instanceof Element)) {
    return false;
  }

  const interactiveChild = target.closest(interactiveChildSelector);
  return Boolean(interactiveChild && interactiveChild !== currentTarget);
};

const openRouteInNewTab = (route: string) => {
  window.open(getAppRouteHref(route), "_blank", "noopener,noreferrer");
};

const navigateInSameTab = ({
  route,
  navigate,
  navigateOptions,
}: CardNavigationOptions) => {
  if (isExternalRoute(route)) {
    window.location.assign(route);
    return;
  }

  navigate(normalizeAppRoute(route), navigateOptions);
};

const runCardNavigation = (
  shouldOpenNewTab: boolean,
  options: CardNavigationOptions
) => {
  if (options.disabled) {
    options.onBlocked?.();
    return;
  }

  if (shouldOpenNewTab) {
    openRouteInNewTab(options.route);
    return;
  }

  navigateInSameTab(options);
};

export const handleCardClickNavigation = (
  event: MouseEvent<HTMLElement>,
  options: CardNavigationOptions
) => {
  if (isFromInteractiveChild(event) || event.button !== 0) {
    return;
  }

  event.preventDefault();
  runCardNavigation(event.ctrlKey || event.metaKey, options);
};

export const handleCardAuxClickNavigation = (
  event: MouseEvent<HTMLElement>,
  options: CardNavigationOptions
) => {
  if (isFromInteractiveChild(event) || event.button !== 1) {
    return;
  }

  event.preventDefault();
  runCardNavigation(true, options);
};

export const handleCardContextMenuNavigation = (
  event: MouseEvent<HTMLElement>,
  options: CardNavigationOptions
) => {
  if (isFromInteractiveChild(event)) {
    return;
  }

  event.preventDefault();
  runCardNavigation(event.ctrlKey || event.metaKey, options);
};

export const handleCardKeyNavigation = (
  event: KeyboardEvent<HTMLElement>,
  options: CardNavigationOptions
) => {
  if (
    isFromInteractiveChild(event) ||
    (event.key !== "Enter" && event.key !== " ")
  ) {
    return;
  }

  event.preventDefault();
  runCardNavigation(event.ctrlKey || event.metaKey, options);
};

export const getCardNavigationHandlers = (options: CardNavigationOptions) => ({
  onClick: (event: MouseEvent<HTMLElement>) =>
    handleCardClickNavigation(event, options),
  onAuxClick: (event: MouseEvent<HTMLElement>) =>
    handleCardAuxClickNavigation(event, options),
  onContextMenu: (event: MouseEvent<HTMLElement>) =>
    handleCardContextMenuNavigation(event, options),
  onKeyDown: (event: KeyboardEvent<HTMLElement>) =>
    handleCardKeyNavigation(event, options),
});
