import { useRef, useState } from "react";
import Moveable from "react-moveable";
import "./App.css";
import Target from "./Target";

const GRID_SIZE = 50;
const SCALE = 1;
const CELL_SIZE = GRID_SIZE; // 논리적 레이아웃 단위
// 하나의 target 아이템 크기 (cell 단위)
const ITEM_W = 2;
const ITEM_H = 2;

export type TargetData = {
  id: string;
  x: number;
  y: number;
};

// px ↔ cell 변환
const pxToCell = (px: number) => Math.round(px / CELL_SIZE);
const cellToPx = (cell: number) => cell * CELL_SIZE;

// cell 충돌 판정
function isOverlapCell(a: any, b: any) {
  return !(
    a.x + a.w <= b.x ||
    a.x >= b.x + b.w ||
    a.y + a.h <= b.y ||
    a.y >= b.y + b.h
  );
}

/*
 * 간단한 Reflow 알고리즘
 * items: cell 단위 레이아웃
 * movedId: 사용자가 이동한 아이템 id
 */
function simpleReflow(items: any[], movedId: string) {
  const fixed = items.find((i) => i.id === movedId); // 이동된 아이템 = 기준(고정)
  const others = items.filter((i) => i.id !== movedId); // 나머지 아이템들

  // 위에 있던 것부터 -> 좌측에 있던 것부터 순서대로 재배치
  others.sort((a, b) => a.y - b.y || a.x - b.x);

  const placed = [fixed];

  for (const item of others) {
    let y = 0;

    while (true) {
      // 현재 item을 y 위치에 놓았을 때
      const test = { ...item, y };

      // 이미 놓인 것들과 겹치는지 검사
      const hit = placed.some((p) => isOverlapCell(test, p));

      if (!hit) {
        placed.push(test);
        break;
      }
      y += 1; // 겹치면 한 줄 아래로 이동
    }
  }

  return placed;
}

function App() {
  const [previewTargets, setPreviewTargets] = useState<TargetData[] | null>(
    null,
  ); // onDrag 중인 미리보기 상태
  const [targets, setTargets] = useState<TargetData[]>([
    { id: "A", x: 0, y: 0 },
    { id: "B", x: 100, y: 0 },
    { id: "C", x: 200, y: 0 },
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const targetRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // 선택된 타겟 정보
  const selectedTarget = selectedId
    ? targets.find((t) => t.id === selectedId)
    : null;

  const renderTargets = previewTargets ?? targets;

  return (
    <div
      className="editor"
      onClickCapture={() => setSelectedId(null)}
      style={{
        ["--grid-size" as any]: `${GRID_SIZE * SCALE}px`,
        ["--grid-large" as any]: `${GRID_SIZE * 5 * SCALE}px`,
      }}
    >
      {renderTargets.map((t) => (
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

      {selectedTarget && (
        <Moveable
          target={targetRefs.current[selectedId!]}
          draggable
          throttleDrag={0}
          onDragStart={(e) => {
            e.target.classList.add("dragging");
          }}
          onDrag={(e) => {
            const [dx, dy] = e.beforeTranslate;

            // 시각적 이동은 px 그대로 (부드러움 담당)
            e.target.style.transform = `translate(${dx}px, ${dy}px)`;

            // 1. 논리적 위치는 cell 단위로 변환
            const nextCellX = pxToCell(dx);
            const nextCellY = pxToCell(dy);

            // 2. 현재 "진짜 레이아웃"을 cell로 변환
            const cellItems = targets.map((t) => ({
              id: t.id,
              x: pxToCell(t.x),
              y: pxToCell(t.y),
              w: ITEM_W,
              h: ITEM_H,
            }));

            // 3. 이동 중인 아이템 반영
            const moved = cellItems.map((i) =>
              i.id === selectedId ? { ...i, x: nextCellX, y: nextCellY } : i,
            );

            // 4. preview reflow 실행
            const reflowed = simpleReflow(moved, selectedId!);

            // 5. cell → px 변환해서 previewTargets 갱신
            setPreviewTargets(
              reflowed.map((c) => ({
                id: c.id,
                x: cellToPx(c.x),
                y: cellToPx(c.y),
              })),
            );
          }}
          onDragEnd={(e) => {
            e.target.classList.remove("dragging");

            // 1. 마지막 이동 의도(px)
            const [dx, dy] = e.lastEvent.beforeTranslate;

            // 2. 셀 좌표로 스냅
            const snapCellX = pxToCell(dx);
            const snapCellY = pxToCell(dy);

            const snapPxX = cellToPx(snapCellX);
            const snapPxY = cellToPx(snapCellY);

            // 3. DOM을 셀 위치로 강제 스냅 - 자석 효과
            e.target.style.transform = `translate(${snapPxX}px, ${snapPxY}px)`;

            // 4. 실제 targets 업데이트
            if (previewTargets) {
              setTargets(previewTargets);
              setPreviewTargets(null);
            }
          }}
        />
      )}
    </div>
  );
}

export default App;
