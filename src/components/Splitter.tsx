"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  /** vertical: 竖直分割条, 左右拖动调整宽度; horizontal: 水平分割条, 上下拖动调整高度 */
  orientation: "vertical" | "horizontal";
  /** 拖动增量(px, 向右/向下为正) */
  onDrag: (delta: number) => void;
  /** 双击还原默认尺寸 */
  onReset?: () => void;
  /** 键盘方向键步长(px) */
  step?: number;
  /** 无障碍标签 / 悬浮提示 */
  label?: string;
}

/**
 * 可拖拽分割条
 * - 鼠标 / 触摸拖动(pointer events + 指针捕获, 拖动时全局光标变为 resize)
 * - 键盘方向键微调(←/→ 或 ↑/↓)
 * - 双击还原默认尺寸
 */
export default function Splitter({ orientation, onDrag, onReset, step = 16, label }: Props) {
  const [dragging, setDragging] = useState(false);
  const last = useRef(0);
  const isVertical = orientation === "vertical";

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      last.current = isVertical ? e.clientX : e.clientY;
      setDragging(true);
    },
    [isVertical],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      const pos = isVertical ? e.clientX : e.clientY;
      const delta = pos - last.current;
      if (delta === 0) return;
      last.current = pos;
      onDrag(delta);
    },
    [dragging, isVertical, onDrag],
  );

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragging(false);
  }, []);

  /* 拖动过程中: 全局光标 + 禁止选中文字 */
  useEffect(() => {
    if (!dragging) return;
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = isVertical ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
    };
  }, [dragging, isVertical]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const back = isVertical ? "ArrowLeft" : "ArrowUp";
    const fwd = isVertical ? "ArrowRight" : "ArrowDown";
    if (e.key === back) {
      e.preventDefault();
      onDrag(-step);
    } else if (e.key === fwd) {
      e.preventDefault();
      onDrag(step);
    }
  };

  const hint = label ?? (isVertical ? "拖动调整宽度" : "拖动调整高度");

  return (
    <div
      role="separator"
      aria-orientation={isVertical ? "vertical" : "horizontal"}
      aria-label={hint}
      title={`${hint} · 双击还原`}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={onReset}
      onKeyDown={handleKeyDown}
      style={{ touchAction: "none" }}
      className={[
        "group relative z-10 flex shrink-0 items-center justify-center outline-none",
        isVertical ? "w-2 cursor-col-resize" : "h-2 cursor-row-resize",
      ].join(" ")}
    >
      {/* 抓握提示: 静置时低调, 悬浮/拖动时高亮 */}
      <span
        className={[
          "pointer-events-none rounded-full transition-colors duration-150",
          isVertical ? "h-10 w-1" : "h-1 w-10",
          dragging ? "bg-accent" : "bg-border group-hover:bg-accent group-focus-visible:bg-accent",
        ].join(" ")}
      />
    </div>
  );
}
