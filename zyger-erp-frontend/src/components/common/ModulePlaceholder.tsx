interface ModulePlaceholderProps {
  title?: string;
  screenId?: string;
}

export default function ModulePlaceholder({ title, screenId }: ModulePlaceholderProps) {
  return (
    <>
      <div className="pg-head">
        <h1>{title || 'Module'}</h1>
        <p>Screen pending backend integration</p>
      </div>

      <div className="panel">
        <div className="empty">
          <span className="material-symbols-rounded">construction</span>
          This screen is not connected to the backend yet.
          {screenId ? <div className="mut">Screen ID: {screenId}</div> : null}
        </div>
      </div>
    </>
  );
}