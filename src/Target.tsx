import { forwardRef } from "react";
import { GRID_SIZE, type TargetData } from "./App";

type Props = {
  data: TargetData;
  selected: boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
};

function cellToPxRect(item: TargetData) {
  return {
    transform: `translate(${item.x * GRID_SIZE}px, ${item.y * GRID_SIZE}px)`,
    width: item.w * GRID_SIZE,
    height: item.h * GRID_SIZE,
  };
}

const Target = forwardRef<HTMLDivElement, Props>(
  ({ data, selected, onSelect }, ref) => {
    const style = cellToPxRect(data);

    return (
      <div
        ref={ref}
        className={`target ${selected ? "selected" : ""}`}
        onClickCapture={(e) => onSelect(data.id, e)}
        style={style}
      >
        Target {data.id}
      </div>
    );
  },
);

export default Target;
