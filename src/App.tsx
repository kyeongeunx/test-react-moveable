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
    { id: "B", x: 2, y: 1, w: 1, h: 2 },
    { id: "C", x: 4, y: 1, w: 3, h: 3 },
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const targetRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const resizeStartSize = useRef<{ w: number; h: number } | null>(null); // resize 시작 기준 cell 크기
  const editorRef = useRef<HTMLDivElement>(null); // editor DOM
  const lastClampedTranslate = useRef<{ x: number; y: number } | null>(null); // onDrag 중 마지막 클램프된 translate 값

  // 선택된 타겟 정보
  const selectedTarget = selectedId
    ? targets.find((t) => t.id === selectedId)
    : null;

  // 렌더링할 타겟 목록 (드래그 중이면 previewTargets 사용)
  const renderTargets = previewTargets ?? targets;

  // editor px -> cell
  function getEditorBoundsCell() {
    if (!editorRef.current) return null;

    const { width, height } = editorRef.current.getBoundingClientRect();

    return {
      maxX: Math.floor(width / GRID_SIZE),
      maxY: Math.floor(height / GRID_SIZE),
    };
  }

  // 아이템을 editor 경계 내로 강제 클램핑
  function clampToBounds(
    item: TargetData,
    bounds: { maxX: number; maxY: number },
  ): TargetData {
    return {
      ...item,
      x: Math.max(0, Math.min(item.x, bounds.maxX - item.w)),
      y: Math.max(0, Math.min(item.y, bounds.maxY - item.h)),
    };
  }
  // px 클램핑
  function clampPx(value: number, min: number, max: number) {
    return Math.max(min, Math.min(value, max));
  }

  // 경계 내 클램핑 + 리플로우 적용
  function applyBoundsAndReflow(
    items: TargetData[],
    movedId: string,
    bounds: { maxX: number; maxY: number },
  ) {
    // 1. 1차 clamp
    const bounded = items.map((i) => clampToBounds(i, bounds));

    // 2. reflow
    const reflowed = localPushReflow(bounded, movedId);

    // 3. 2차 clamp (밀림 결과 보정)
    return reflowed.map((i) => clampToBounds(i, bounds));
  }

  return (
    <div
      ref={editorRef}
      className="editor"
      onClickCapture={() => setSelectedId(null)}
      style={{
        ["--grid-large" as any]: `${GRID_SIZE * SCALE}px`,
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

            const bounds = editorRef.current!.getBoundingClientRect();
            console.log("editor bounds:", bounds);

            const t = targets.find((t) => t.id === selectedId)!;

            // 원래 크기 (px)
            const widthPx = t.w * GRID_SIZE;
            const heightPx = t.h * GRID_SIZE;

            // 허용 가능한 이동 범위 (px)
            const minDx = 0;
            const maxDx = bounds.width - widthPx;
            const minDy = 0;
            const maxDy = bounds.height - heightPx;

            // px 이동 clamp
            const clampedDx = clampPx(dx, minDx, maxDx);
            const clampedDy = clampPx(dy, minDy, maxDy);

            // DragEnd를 위해 저장
            lastClampedTranslate.current = { x: clampedDx, y: clampedDy };

            // 시각적 이동 (px)
            e.target.style.transform = `translate(${clampedDx}px, ${clampedDy}px)`;

            // 1. px -> cell
            const nextCellX = Math.round(clampedDx / GRID_SIZE);
            const nextCellY = Math.round(clampedDy / GRID_SIZE);

            const original = targets.find((t) => t.id === selectedId)!;
            if (nextCellX === original.x && nextCellY === original.y) return;

            // 2. drag 반영
            const moved = targets.map((i) =>
              i.id === selectedId ? { ...i, x: nextCellX, y: nextCellY } : i,
            );

            // 3. clamp + reflow
            const cellBounds = getEditorBoundsCell()!;
            const result = applyBoundsAndReflow(moved, selectedId!, cellBounds);

            // 4. previewTargets 갱신
            setPreviewTargets(result);
          }}
          onDragEnd={(e) => {
            e.target.classList.remove("dragging");

            const bounds = getEditorBoundsCell();
            if (!bounds) return;

            const last = lastClampedTranslate.current;
            if (!last) return;

            // 마지막 이동 (px)
            const { x: dx, y: dy } = last;

            // 1. px → cell
            const snapCellX = Math.round(dx / GRID_SIZE);
            const snapCellY = Math.round(dy / GRID_SIZE);

            // 2. DOM 강제 스냅 - 자석 효과
            e.target.style.transform = `translate(
              ${snapCellX * GRID_SIZE}px,
              ${snapCellY * GRID_SIZE}px
            )`;

            // 3. 실제 targets 업데이트
            if (previewTargets) {
              // commit 시에도 clamp 보장
              const final = previewTargets.map((i) => clampToBounds(i, bounds));

              setTargets(final);
              setPreviewTargets(null);
            }
          }}
          onResizeStart={() => {
            const t = targets.find((t) => t.id === selectedId)!;
            resizeStartSize.current = { w: t.w, h: t.h };
          }}
          onResize={(e) => {
            const { width, height } = e;

            const bounds = getEditorBoundsCell();
            if (!bounds) return;

            // 시각적 이동 (px)
            e.target.style.width = `${width}px`;
            e.target.style.height = `${height}px`;

            // 1. px -> cell
            const nextCellW = Math.max(1, Math.round(width / GRID_SIZE));
            const nextCellH = Math.max(1, Math.round(height / GRID_SIZE));

            const start = resizeStartSize.current!;
            if (nextCellW === start.w && nextCellH === start.h) return;

            // 2. resize 반영
            const resized = targets.map((t) =>
              t.id === selectedId ? { ...t, w: nextCellW, h: nextCellH } : t,
            );

            // 3. clamp + reflow
            const result = applyBoundsAndReflow(resized, selectedId!, bounds);

            // 4. previewTargets 갱신
            setPreviewTargets(result);
          }}
          onResizeEnd={(e) => {
            resizeStartSize.current = null;

            const bounds = getEditorBoundsCell();
            if (!bounds) return;

            // 마지막 크기 (px)
            const { width, height } = e.lastEvent;

            // 1. px → cell
            const snapCellW = Math.max(1, Math.round(width / GRID_SIZE));
            const snapCellH = Math.max(1, Math.round(height / GRID_SIZE));

            // 2. DOM 강제 스냅 - 자석 효과
            e.target.style.width = `${snapCellW * GRID_SIZE}px`;
            e.target.style.height = `${snapCellH * GRID_SIZE}px`;

            // 3. 실제 targets 업데이트
            if (previewTargets) {
              // commit 시에도 clamp 보장
              const final = previewTargets.map((i) => clampToBounds(i, bounds));

              setTargets(final);
              setPreviewTargets(null);
            }
          }}
        />
      )}
    </div>
  );
}

export default App;
