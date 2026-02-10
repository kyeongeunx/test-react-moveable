import { forwardRef } from "react";

type Props = {
  data: {
    id: string;
    x: number;
    y: number;
  };
  selected: boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
};

const Target = forwardRef<HTMLDivElement, Props>(
  ({ data, selected, onSelect }, ref) => {
    return (
      <div
        ref={ref}
        className="target"
        onClickCapture={(e) => onSelect(data.id, e)}
        style={{
          transform: `translate(${data.x}px, ${data.y}px)`,
        }}
      >
        Target
      </div>
    );
  },
);

export default Target;
