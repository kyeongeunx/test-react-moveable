import { forwardRef } from "react";
import type { TargetData } from "./App";

type Props = {
  data: TargetData;
  onSelect: (id: string, e: React.MouseEvent) => void;
};

const Target = forwardRef<HTMLDivElement, Props>(({ data, onSelect }, ref) => {
  return (
    <div
      ref={ref}
      className="target"
      onClickCapture={(e) => onSelect(data.id, e)}
      style={{
        transform: `translate(${data.x}px, ${data.y}px)`,
      }}
    >
      Target {data.id}
    </div>
  );
});

export default Target;
