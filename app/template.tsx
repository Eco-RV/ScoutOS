/** Re-mounts on every route change, so each page eases in instead of snapping. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="rise">{children}</div>;
}
