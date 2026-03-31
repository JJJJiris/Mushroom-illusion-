import { create } from "zustand";
import {
  parseCustomToPx,
  presetToPx,
  type PresetKey,
} from "../lib/canvasPresets";
import type { ImageExtractMode } from "../lib/imageContours";
import type { ImageContourFillStyle } from "../lib/diffuseRender";
import {
  randomHarmoniousPalette,
  RECOMMENDED_PALETTES,
} from "../lib/colorPalette";
import { dist2 } from "../lib/geometry";

export type AppMode = "hand" | "image";

type DesignState = {
  preset: PresetKey | "custom";
  customW: number;
  customH: number;
  unit: "px" | "mm";
  snapEven: boolean;
  canvasW: number;
  canvasH: number;
  /** 画板背景（导出 PNG 时使用） */
  canvasBgColor: string;

  mode: AppMode;
  /** 光晕外圈半径倍率，相对内置默认，约 0.35～2.5 */
  radialCircleScale: number;

  colors: string[];

  /**
   * 食指轨迹形成的「隐形曲线」（画布像素），整屏弥散沿此法线方向起伏。
   * 少于 2 点时由默认曲线 + handFlowPhase 渲染。
   */
  handFlowPath: [number, number][];
  /** 控制沿曲线起伏的相位（弧度），随手部移动速度累加 */
  handFlowPhase: number;
  /** 轨迹撤销后的分段（用于重做） */
  handRedoChunks: [number, number][][];

  imageUrl: string | null;
  imageElement: HTMLImageElement | null;
  imageContour: [number, number][];
  imageEdgeThreshold: number;
  imageBlur: number;
  imageSimplify: number;
  imageExtractMode: ImageExtractMode;
  /** 图片轮廓填色：向内渐变 / 多中心径向 */
  imageFillStyle: ImageContourFillStyle;
  /** 向内渐变渗透深度（相对剪影包围短边） */
  imageInwardDepth: number;

  setPreset: (key: PresetKey) => void;
  setCanvasOrientation: (o: "portrait" | "landscape") => void;
  setCanvasBgColor: (hex: string) => void;
  setCustomFields: (partial: Partial<Pick<DesignState, "customW" | "customH" | "unit" | "snapEven">>) => void;
  applyCustomSize: () => void;
  setMode: (m: AppMode) => void;
  setRadialCircleScale: (n: number) => void;
  setColors: (c: string[]) => void;
  setColorAt: (index: number, hex: string) => void;
  addColorStop: () => void;
  removeColorStop: (index: number) => void;
  applyRandomColors: () => void;
  applyRecommendedPalette: (id: string) => void;

  appendHandFlowPoint: (p: [number, number]) => void;
  bumpHandFlowPhase: (delta: number) => void;
  undoHandFlow: () => void;
  redoHandFlow: () => void;

  setImageUrl: (url: string | null) => void;
  setImageElement: (el: HTMLImageElement | null) => void;
  setImageContour: (c: [number, number][]) => void;
  setImageEdgeThreshold: (n: number) => void;
  setImageBlur: (n: number) => void;
  setImageSimplify: (n: number) => void;
  setImageExtractMode: (m: ImageExtractMode) => void;

  setImageFillStyle: (s: ImageContourFillStyle) => void;
  setImageInwardDepth: (n: number) => void;

  clearArt: () => void;
};

function initialColors(): string[] {
  return ["#6366f1", "#a855f7", "#ec4899"];
}

const init = presetToPx("A4");

export const useDesignStore = create<DesignState>((set, get) => ({
  preset: "A4",
  customW: 210,
  customH: 297,
  unit: "mm",
  snapEven: true,
  canvasW: init.w,
  canvasH: init.h,
  canvasBgColor: "#ffffff",

  mode: "hand",
  radialCircleScale: 1,

  colors: initialColors(),

  handFlowPath: [],
  handFlowPhase: 0,
  handRedoChunks: [],

  imageUrl: null,
  imageElement: null,
  imageContour: [],
  imageEdgeThreshold: 28,
  imageBlur: 1,
  imageSimplify: 0.008,
  imageExtractMode: "auto" as ImageExtractMode,
  imageFillStyle: "inward" as ImageContourFillStyle,
  imageInwardDepth: 0.42,

  setPreset: (key) => {
    const { w, h } = presetToPx(key);
    set({
      preset: key,
      canvasW: w,
      canvasH: h,
    });
  },

  setCanvasOrientation: (o) => {
    const s = get();
    const isLandscape = s.canvasW >= s.canvasH;
    if ((o === "landscape") === isLandscape) return;
    set({
      canvasW: s.canvasH,
      canvasH: s.canvasW,
      customW: s.customH,
      customH: s.customW,
    });
  },

  setCustomFields: (partial) => set(partial),

  setCanvasBgColor: (hex) => set({ canvasBgColor: hex }),

  applyCustomSize: () => {
    const { customW, customH, unit, snapEven } = get();
    const { w, h } = parseCustomToPx(customW, customH, unit, snapEven);
    set({ preset: "custom", canvasW: w, canvasH: h });
  },

  setMode: (m) => set({ mode: m }),

  setRadialCircleScale: (n) =>
    set({
      radialCircleScale: Math.min(2.5, Math.max(0.35, n)),
    }),

  setColors: (c) => set({ colors: c.slice(0, 6) }),

  setColorAt: (index, hex) => {
    const colors = [...get().colors];
    if (index >= 0 && index < colors.length) {
      colors[index] = hex;
      set({ colors });
    }
  },

  addColorStop: () => {
    const colors = [...get().colors];
    if (colors.length < 4) colors.push("#ffffff");
    set({ colors });
  },

  removeColorStop: (index) => {
    const colors = get().colors.filter((_, i) => i !== index);
    if (colors.length < 2) return;
    set({ colors });
  },

  applyRandomColors: () => set({ colors: randomHarmoniousPalette(4) }),

  applyRecommendedPalette: (id) => {
    const p = RECOMMENDED_PALETTES.find((x) => x.id === id);
    if (p) set({ colors: [...p.colors] });
  },

  appendHandFlowPoint: (p) => {
    const { handFlowPath } = get();
    const MIN = 5;
    if (handFlowPath.length > 0) {
      const last = handFlowPath[handFlowPath.length - 1];
      if (dist2(last, p) < MIN * MIN) return;
    }
    let next = [...handFlowPath, p];
    const MAX = 720;
    if (next.length > MAX) next = next.slice(-MAX);
    set({ handFlowPath: next, handRedoChunks: [] });
  },

  bumpHandFlowPhase: (delta) =>
    set({ handFlowPhase: get().handFlowPhase + delta }),

  undoHandFlow: () => {
    const { handFlowPath, handRedoChunks } = get();
    if (handFlowPath.length === 0) return;
    const STEP = 24;
    const cut = Math.max(0, handFlowPath.length - STEP);
    const removed = handFlowPath.slice(cut);
    const keep = handFlowPath.slice(0, cut);
    const nextRedo = [...handRedoChunks, removed].slice(-30);
    set({ handFlowPath: keep, handRedoChunks: nextRedo });
  },

  redoHandFlow: () => {
    const { handFlowPath, handRedoChunks } = get();
    if (handRedoChunks.length === 0) return;
    const chunk = handRedoChunks[handRedoChunks.length - 1];
    let next = [...handFlowPath, ...chunk];
    const MAX = 720;
    if (next.length > MAX) next = next.slice(-MAX);
    set({
      handFlowPath: next,
      handRedoChunks: handRedoChunks.slice(0, -1),
    });
  },

  setImageUrl: (url) => set({ imageUrl: url }),

  setImageElement: (el) => set({ imageElement: el }),

  setImageContour: (c) => set({ imageContour: c }),

  setImageEdgeThreshold: (n) => set({ imageEdgeThreshold: Math.max(5, Math.min(95, n)) }),

  setImageBlur: (n) => set({ imageBlur: Math.max(0, Math.min(5, Math.round(n))) }),

  setImageSimplify: (n) => set({ imageSimplify: Math.max(0.002, Math.min(0.05, n)) }),

  setImageExtractMode: (m) => set({ imageExtractMode: m }),

  setImageFillStyle: (s) => set({ imageFillStyle: s }),

  setImageInwardDepth: (n) =>
    set({ imageInwardDepth: Math.min(0.88, Math.max(0.12, n)) }),

  clearArt: () => {
    const { imageUrl } = get();
    if (imageUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(imageUrl);
    }
    set({
      handFlowPath: [],
      handFlowPhase: 0,
      handRedoChunks: [],
      imageContour: [],
      imageUrl: null,
      imageElement: null,
    });
  },
}));
