import { useRef, useState } from "react";
import Moveable from "react-moveable";
import "./App.css";
import Target from "./Target";

const GRID_SIZE = 50;
const SCALE = 1;

function App() {
  const [targets, setTargets] = useState<
    { id: string; x: number; y: number }[]
  >([
    { id: "A", x: 0, y: 0 },
    { id: "B", x: 120, y: 0 },
    { id: "C", x: 240, y: 0 },
  ]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const targetRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const selectedTarget = selectedId
    ? targets.find((t) => t.id === selectedId)
    : null;

  return (
    <div
      className="editor"
      onClickCapture={() => setSelectedId(null)}
      style={{
        ["--grid-size" as any]: `${GRID_SIZE * SCALE}px`,
        ["--grid-large" as any]: `${GRID_SIZE * 5 * SCALE}px`,
      }}
    >
      {targets.map((t) => (
        <Target
          key={t.id}
          data={t}
          selected={selectedId === t.id}
          onSelect={(id, e) => {
            e.stopPropagation();
            setSelectedId(id);
          }}
          ref={(el) => {
            targetRefs.current[t.id] = el;
          }}
        />
      ))}

      {selectedTarget && (
        <div
          className="selection-ui"
          style={{
            transform: `translate(${selectedTarget.x}px, ${selectedTarget.y}px)`,
          }}
        />
      )}

      {selectedId && (
        <Moveable
          target={targetRefs.current[selectedId]}
          draggable
          snappable={false}
          throttleDrag={0}
          onDrag={(e) => {
            // 드래그 중엔 DOM만 이동
            e.target.style.transform = e.transform;
          }}
          onDragEnd={(e) => {
            const [dx, dy] = e.lastEvent.beforeTranslate;

            // 그리드 스냅
            const snappedX = Math.round(dx / GRID_SIZE) * GRID_SIZE;
            const snappedY = Math.round(dy / GRID_SIZE) * GRID_SIZE;

            e.target.style.transform = `translate(${snappedX}px, ${snappedY}px)`;

            setTargets((prev) =>
              prev.map((t) =>
                t.id === selectedId ? { ...t, x: snappedX, y: snappedY } : t,
              ),
            );
          }}
        />
      )}
    </div>
  );
}

export default App;
