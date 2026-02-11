import { useRef, useState } from "react";
import Moveable from "react-moveable";
import "./App.css";
import Target from "./Target";

export const GRID_SIZE = 100;
const SCALE = 1;

// cell 단위 타겟 데이터
export type TargetData = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

// cell 충돌 판정
function isOverlapCell(a: TargetData, b: TargetData) {
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
// function simpleReflow(items: TargetData[], movedId: string) {
//   const fixed = items.find((i) => i.id === movedId); // 이동된 아이템 = 기준(고정)
//   const others = items.filter((i) => i.id !== movedId); // 나머지 아이템들

//   // 위에 있던 것부터 -> 좌측에 있던 것부터 순서대로 재배치
//   others.sort((a, b) => a.y - b.y || a.x - b.x);

//   const placed = [fixed];

//   for (const item of others) {
//     let y = 0;

//     while (true) {
//       // 현재 item을 y 위치에 놓았을 때
//       const test = { ...item, y };

//       // 이미 놓인 것들과 겹치는지 검사
//       const hit = placed.some((p) => isOverlapCell(test, p));

//       if (!hit) {
//         placed.push(test);
//         break;
//       }
//       y += 1; // 겹치면 한 줄 아래로 이동
//     }
//   }

//   return placed;
// }

function localPushReflow(items: TargetData[], movedId: string) {
  const map = new Map(items.map((i) => [i.id, { ...i }]));
  const moved = map.get(movedId)!;

  const queue = [moved];

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const item of map.values()) {
      if (item.id === current.id) continue;

      if (isOverlapCell(current, item)) {
        //  겹친 경우만 아래로 밀기
        item.y = current.y + current.h;

        queue.push(item);
      }
    }
  }

  return Array.from(map.values());
}

function App() {
  const [previewTargets, setPreviewTargets] = useState<TargetData[] | null>(
    null,
  ); // onDrag 중인 미리보기 상태
  const [targets, setTargets] = useState<TargetData[]>([
    { id: "A", x: 0, y: 0, w: 2, h: 2 },
    { id: "B", x: 4, y: 1, w: 1, h: 2 },
    { id: "C", x: 6, y: 1, w: 3, h: 3 },
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const targetRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const resizeStartSize = useRef<{ w: number; h: number } | null>(null); // resize 시작 기준 cell 크기

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
          selected={t.id === selectedId}
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
        <Moveable
          target={targetRefs.current[selectedId!]}
          draggable
          resizable
          throttleDrag={0}
          throttleResize={0}
          onDragStart={(e) => {
            e.target.classList.add("dragging");
          }}
          onDrag={(e) => {
            const [dx, dy] = e.beforeTranslate;

            // 시각적 이동은 px 그대로 (부드러움 담당)
            e.target.style.transform = `translate(${dx}px, ${dy}px)`;

            // 1. 논리적 위치는 cell 단위로 변환
            const nextCellX = Math.round(dx / GRID_SIZE);
            const nextCellY = Math.round(dy / GRID_SIZE);

            // 2. 이동 중인 아이템 반영
            const moved = targets.map((i) =>
              i.id === selectedId ? { ...i, x: nextCellX, y: nextCellY } : i,
            );

            // 3. preview reflow 실행
            const reflowed = localPushReflow(moved, selectedId!);

            // 4.  previewTargets 갱신
            setPreviewTargets(reflowed);
          }}
          onDragEnd={(e) => {
            e.target.classList.remove("dragging");

            // 1. 마지막 이동 의도(px)
            const [dx, dy] = e.lastEvent.beforeTranslate;

            // 2. px → cell
            const snapCellX = Math.round(dx / GRID_SIZE);
            const snapCellY = Math.round(dy / GRID_SIZE);

            // 3. cell → px (DOM 표현용)
            const snapPxX = snapCellX * GRID_SIZE;
            const snapPxY = snapCellY * GRID_SIZE;

            // 4. DOM을 셀 위치로 강제 스냅 - 자석 효과
            e.target.style.transform = `translate(${snapPxX}px, ${snapPxY}px)`;

            // 5. 실제 targets 업데이트
            if (previewTargets) {
              setTargets(previewTargets);
              setPreviewTargets(null);
            }
          }}
          onResizeStart={() => {
            const t = targets.find((t) => t.id === selectedId)!;
            resizeStartSize.current = { w: t.w, h: t.h };
          }}
          onResize={(e) => {
            const { width, height } = e;

            // 시각적 이동은 px 그대로 (부드러움 담당)
            e.target.style.width = `${width}px`;
            e.target.style.height = `${height}px`;

            // 1. 논리적 위치는 cell 단위로 변환
            const nextCellW = Math.max(1, Math.round(width / GRID_SIZE));
            const nextCellH = Math.max(1, Math.round(height / GRID_SIZE));

            const start = resizeStartSize.current!;
            if (nextCellW === start.w && nextCellH === start.h) return;

            // 2. 리사이징 중인 아이템 반영
            const resized = targets.map((t) =>
              t.id === selectedId ? { ...t, w: nextCellW, h: nextCellH } : t,
            );

            // 3. preview reflow 실행
            const reflowed = localPushReflow(resized, selectedId!);

            // 4. previewTargets 갱신
            setPreviewTargets(reflowed);
          }}
          onResizeEnd={(e) => {
            resizeStartSize.current = null;

            // 1. 마지막 크기 의도(px)
            const { width, height } = e.lastEvent;

            // 2. px → cell
            const snapCellW = Math.max(1, Math.round(width / GRID_SIZE));
            const snapCellH = Math.max(1, Math.round(height / GRID_SIZE));

            // 3. cell → px (DOM 표현용)
            const snapPxW = snapCellW * GRID_SIZE;
            const snapPxH = snapCellH * GRID_SIZE;

            // 4. DOM을 셀 크기로 강제 스냅 - 자석 효과
            e.target.style.width = `${snapPxW}px`;
            e.target.style.height = `${snapPxH}px`;

            // 5. 실제 targets 업데이트
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
