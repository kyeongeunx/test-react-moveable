import { useRef, useState } from "react";
import Moveable from "react-moveable";
import "./App.css";

const GRID_SIZE = 30;
const SCALE = 1;

function App() {
  const [selected, setSelected] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const targetRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="editor"
      onClickCapture={() => {
        setSelected(false);
      }}
      style={{
        ["--grid-size" as any]: `${GRID_SIZE * SCALE}px`,
        ["--grid-large" as any]: `${GRID_SIZE * 5 * SCALE}px`,
      }}
    >
      <div
        ref={targetRef}
        className="target"
        onClickCapture={(e) => {
          e.stopPropagation();
          setSelected(true);
        }}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
        }}
      >
        Target
      </div>

      {selected && (
        <div
          className="selection-ui"
          style={{
            transform: `translate(${position.x}px, ${position.y}px)`,
          }}
        />
      )}

      {selected && (
        <Moveable
          target={targetRef}
          draggable
          snappable={false}
          throttleDrag={0}
          onDrag={(e) => {
            e.target.style.transform = e.transform;
          }}
          onDragEnd={(e) => {
            const [x, y] = e.lastEvent.beforeTranslate;

            const snappedX = Math.round(x / GRID_SIZE) * GRID_SIZE;
            const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE;

            e.target.style.transform = `translate(${snappedX}px, ${snappedY}px)`;

            setPosition({ x: snappedX, y: snappedY });
          }}
        />
      )}
    </div>
  );
}

export default App;
