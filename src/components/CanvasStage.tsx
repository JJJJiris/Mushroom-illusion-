import {
  forwardRef,
  useEffect,
  useCallback,
  useRef,
  type ForwardedRef,
  type MutableRefObject,
} from "react";
import { useShallow } from "zustand/react/shallow";
import { useDesignStore } from "../store/useDesignStore";
import { rdp } from "../lib/geometry";
import {
  compositeDiffuseFlowSpine,
  compositeDiffusePolygon,
  defaultFlowSpine,
} from "../lib/diffuseRender";

function assignRef<T>(node: T | null, r: ForwardedRef<T>, internal: MutableRefObject<T | null>) {
  internal.current = node;
  if (typeof r === "function") r(node);
  else if (r) (r as MutableRefObject<T | null>).current = node;
}

const DIFFUSE_BLUR = 40;
const DIFFUSE_GRAIN = 0.09;
const DIFFUSE_QUALITY = 0.52;

export const CanvasStage = forwardRef<HTMLCanvasElement>(function CanvasStage(
  _,
  ref
) {
  const internalRef = useRef<HTMLCanvasElement | null>(null);
  const setRef = useCallback(
    (node: HTMLCanvasElement | null) => assignRef(node, ref, internalRef),
    [ref]
  );

  const hostRef = useRef<HTMLDivElement | null>(null);

  const s = useDesignStore(
    useShallow((st) => ({
      canvasW: st.canvasW,
      canvasH: st.canvasH,
      canvasBgColor: st.canvasBgColor,
      colors: st.colors,
      mode: st.mode,
      handFlowPath: st.handFlowPath,
      handFlowPhase: st.handFlowPhase,
      imageContour: st.imageContour,
      radialCircleScale: st.radialCircleScale,
      imageFillStyle: st.imageFillStyle,
      imageInwardDepth: st.imageInwardDepth,
    }))
  );

  const setRadialCircleScale = useDesignStore((st) => st.setRadialCircleScale);

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const current = useDesignStore.getState().radialCircleScale;
      const factor = e.deltaY > 0 ? 0.92 : 1 / 0.92;
      setRadialCircleScale(current * factor);
    },
    [setRadialCircleScale]
  );

  useEffect(() => {
    const host = hostRef.current;
    const canvas = internalRef.current;
    if (!host || !canvas) return;

    const applyFit = () => {
      const rw = host.clientWidth;
      const rh = host.clientHeight;
      if (rw < 2 || rh < 2) return;
      const scale = Math.min(1, rw / s.canvasW, rh / s.canvasH);
      canvas.style.width = `${s.canvasW * scale}px`;
      canvas.style.height = `${s.canvasH * scale}px`;
    };

    applyFit();
    const ro = new ResizeObserver(applyFit);
    ro.observe(host);
    window.addEventListener("resize", applyFit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", applyFit);
    };
  }, [s.canvasW, s.canvasH]);

  useEffect(() => {
    const canvas = internalRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(s.canvasW * dpr);
    canvas.height = Math.round(s.canvasH * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = s.canvasBgColor;
    ctx.fillRect(0, 0, s.canvasW, s.canvasH);

    const diffuseOpts = {
      radialCircleScale: s.radialCircleScale,
      blurPx: DIFFUSE_BLUR,
      grainAlpha: DIFFUSE_GRAIN,
      qualityScale: DIFFUSE_QUALITY,
      imageFillStyle: s.imageFillStyle,
      imageInwardDepth: s.imageInwardDepth,
    };

    if (s.mode === "image" && s.imageContour.length >= 3) {
      compositeDiffusePolygon(
        ctx,
        s.canvasW,
        s.canvasH,
        s.imageContour,
        s.colors,
        diffuseOpts
      );
    }

    if (s.mode === "hand") {
      let spine: [number, number][] =
        s.handFlowPath.length >= 2
          ? s.handFlowPath.length > 32
            ? rdp(s.handFlowPath, 3.2)
            : s.handFlowPath
          : defaultFlowSpine(s.canvasW, s.canvasH, s.handFlowPhase);

      if (spine.length < 2) {
        spine = defaultFlowSpine(s.canvasW, s.canvasH, s.handFlowPhase);
      }

      compositeDiffuseFlowSpine(
        ctx,
        s.canvasW,
        s.canvasH,
        spine,
        s.colors,
        s.handFlowPhase,
        diffuseOpts
      );
    }
  }, [s]);

  return (
    <div ref={hostRef} className="stage-canvas-host">
      <canvas
        ref={setRef}
        className="stage-canvas"
        style={{ display: "block", background: s.canvasBgColor }}
        onWheel={handleWheel}
      />
    </div>
  );
});
