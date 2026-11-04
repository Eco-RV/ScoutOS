/** One NavBar popover is open at a time: each announces itself, and the others close. */
export const POPOVER_EVENT = "nav:popover";

export function closeOthers(name: string) {
  window.dispatchEvent(new CustomEvent(POPOVER_EVENT, { detail: name }));
}
