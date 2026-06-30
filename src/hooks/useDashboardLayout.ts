import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

export type LayoutPreset = 'focus' | 'tasks-first';
type ResizeHandle = 'left-center' | 'center-right';

interface LayoutWidths {
  left: number;
  center: number;
  right: number;
}

interface DragState {
  handle: ResizeHandle;
  startX: number;
  startWidths: LayoutWidths;
}

interface StoredLayout {
  widths: LayoutWidths;
}

interface UseDashboardLayoutReturn {
  widths: LayoutWidths;
  isCompact: boolean;
  activePreset: LayoutPreset | null;
  containerRef: RefObject<HTMLElement>;
  applyPreset: (preset: LayoutPreset) => void;
  startResize: (handle: ResizeHandle, clientX: number) => void;
}

const STORAGE_KEY = 'focusflow_dashboard_layout_v1';
const COMPACT_BREAKPOINT_PX = 1100;

const MIN_WIDTHS: LayoutWidths = { left: 22, center: 30, right: 16 };
const MAX_WIDTHS: LayoutWidths = { left: 50, center: 60, right: 35 };

const PRESETS: Record<LayoutPreset, LayoutWidths> = {
  focus: { left: 25, center: 55, right: 20 },
  'tasks-first': { left: 45, center: 35, right: 20 },
};

const DEFAULT_WIDTHS = PRESETS.focus;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function isValidWidths(widths: LayoutWidths): boolean {
  const total = widths.left + widths.center + widths.right;
  return (
    Math.abs(total - 100) < 0.01 &&
    widths.left >= MIN_WIDTHS.left &&
    widths.left <= MAX_WIDTHS.left &&
    widths.center >= MIN_WIDTHS.center &&
    widths.center <= MAX_WIDTHS.center &&
    widths.right >= MIN_WIDTHS.right &&
    widths.right <= MAX_WIDTHS.right
  );
}

function loadInitialWidths(): LayoutWidths {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WIDTHS;
    const parsed = JSON.parse(raw) as StoredLayout;
    if (!parsed || !parsed.widths) return DEFAULT_WIDTHS;
    return isValidWidths(parsed.widths) ? parsed.widths : DEFAULT_WIDTHS;
  } catch {
    return DEFAULT_WIDTHS;
  }
}

function saveWidths(widths: LayoutWidths): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ widths } satisfies StoredLayout));
  } catch {
    // ignore storage failures
  }
}

export function useDashboardLayout(): UseDashboardLayoutReturn {
  const [widths, setWidths] = useState<LayoutWidths>(loadInitialWidths);
  const [activePreset, setActivePreset] = useState<LayoutPreset | null>('focus');
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isCompact, setIsCompact] = useState<boolean>(() => window.innerWidth <= COMPACT_BREAKPOINT_PX);
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${COMPACT_BREAKPOINT_PX}px)`);
    const onChange = (event: MediaQueryListEvent) => setIsCompact(event.matches);

    setIsCompact(mql.matches);

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }

    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  useEffect(() => {
    if (!isCompact) saveWidths(widths);
  }, [widths, isCompact]);

  const applyPreset = useCallback((preset: LayoutPreset) => {
    setWidths(PRESETS[preset]);
    setActivePreset(preset);
  }, []);

  const startResize = useCallback((handle: ResizeHandle, clientX: number) => {
    if (isCompact || !containerRef.current) return;

    setDragState({
      handle,
      startX: clientX,
      startWidths: widths,
    });
    setActivePreset(null);
  }, [isCompact, widths]);

  useEffect(() => {
    if (!dragState) return;

    const onPointerMove = (event: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.getBoundingClientRect().width;
      if (containerWidth <= 0) return;

      const deltaPx = event.clientX - dragState.startX;
      const deltaPct = (deltaPx / containerWidth) * 100;
      const { startWidths } = dragState;

      if (dragState.handle === 'left-center') {
        const pair = startWidths.left + startWidths.center;
        const minLeft = Math.max(MIN_WIDTHS.left, pair - MAX_WIDTHS.center);
        const maxLeft = Math.min(MAX_WIDTHS.left, pair - MIN_WIDTHS.center);

        const nextLeft = clamp(startWidths.left + deltaPct, minLeft, maxLeft);
        const nextCenter = pair - nextLeft;

        setWidths({
          left: round2(nextLeft),
          center: round2(nextCenter),
          right: round2(startWidths.right),
        });
      } else {
        const pair = startWidths.center + startWidths.right;
        const minCenter = Math.max(MIN_WIDTHS.center, pair - MAX_WIDTHS.right);
        const maxCenter = Math.min(MAX_WIDTHS.center, pair - MIN_WIDTHS.right);

        const nextCenter = clamp(startWidths.center + deltaPct, minCenter, maxCenter);
        const nextRight = pair - nextCenter;

        setWidths({
          left: round2(startWidths.left),
          center: round2(nextCenter),
          right: round2(nextRight),
        });
      }
    };

    const onPointerUp = () => {
      setDragState(null);
    };

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [dragState]);

  return {
    widths,
    isCompact,
    activePreset,
    containerRef,
    applyPreset,
    startResize,
  };
}
