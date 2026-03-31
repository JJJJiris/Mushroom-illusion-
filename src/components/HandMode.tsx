import { useEffect, useRef, useState } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { useI18n } from "../i18n/useI18n";
import { useDesignStore } from "../store/useDesignStore";
import { INDEX_TIP_LM, normToCanvas, type NormPoint } from "../lib/handPath";

const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task";

const PHASE_FROM_SPEED = 0.024;
const IDLE_PHASE_DRIFT = 0.007;

let handLandmarkerPromise: Promise<HandLandmarker> | null = null;

async function getLandmarker(): Promise<HandLandmarker> {
  if (!handLandmarkerPromise) {
    handLandmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
      return HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numHands: 1,
      });
    })();
  }
  return handLandmarkerPromise;
}

type Props = {
  active: boolean;
  mirror?: boolean;
};

export function HandMode({ active, mirror = true }: Props) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const waitRafRef = useRef(0);
  const lastDetectRef = useRef(0);
  const lastTipRef = useRef<[number, number] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canvasW = useDesignStore((s) => s.canvasW);
  const canvasH = useDesignStore((s) => s.canvasH);
  const appendHandFlowPoint = useDesignStore((s) => s.appendHandFlowPoint);
  const bumpHandFlowPhase = useDesignStore((s) => s.bumpHandFlowPhase);

  /** 未开摄像头时仍让默认脊线缓慢流动（预览） */
  useEffect(() => {
    if (active) return;
    const id = window.setInterval(() => {
      useDesignStore.getState().bumpHandFlowPhase(0.055);
    }, 48);
    return () => clearInterval(id);
  }, [active]);

  useEffect(() => {
    if (!active) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      const v = videoRef.current;
      if (v) v.srcObject = null;
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(waitRafRef.current);
      lastTipRef.current = null;
      return;
    }

    let alive = true;

    const cleanupStream = () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      const v = videoRef.current;
      if (v) v.srcObject = null;
    };

    const startPipeline = (video: HTMLVideoElement) => {
      async function run() {
        setError(null);
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user", width: { ideal: 640 } },
            audio: false,
          });
          if (!alive) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
          video.srcObject = stream;
          await video.play();
        } catch {
          setError(t("hand_err_camera"));
          return;
        }

        let lm: HandLandmarker;
        try {
          lm = await getLandmarker();
        } catch {
          setError(t("hand_err_model"));
          return;
        }

        const step = (t: number) => {
          if (!alive) return;
          if (!video.videoWidth) {
            rafRef.current = requestAnimationFrame(step);
            return;
          }
          if (t - lastDetectRef.current > 45) {
            lastDetectRef.current = t;
            const res = lm.detectForVideo(video, performance.now());
            const hand = res.landmarks[0];
            if (hand) {
              const lms = hand as NormPoint[];
              const tip = lms[INDEX_TIP_LM];
              if (tip) {
                const [x, y] = normToCanvas(tip.x, tip.y, canvasW, canvasH, mirror);
                appendHandFlowPoint([x, y]);
                const last = lastTipRef.current;
                if (last) {
                  const spd = Math.hypot(x - last[0], y - last[1]);
                  bumpHandFlowPhase(spd * PHASE_FROM_SPEED + IDLE_PHASE_DRIFT * 0.35);
                } else {
                  bumpHandFlowPhase(IDLE_PHASE_DRIFT * 0.35);
                }
                lastTipRef.current = [x, y];
              }
            } else {
              lastTipRef.current = null;
              bumpHandFlowPhase(IDLE_PHASE_DRIFT);
            }
          }
          rafRef.current = requestAnimationFrame(step);
        };
        lastDetectRef.current = 0;
        lastTipRef.current = null;
        rafRef.current = requestAnimationFrame(step);
      }
      void run();
    };

    const waitVideo = () => {
      if (!alive) return;
      const video = videoRef.current;
      if (!video) {
        waitRafRef.current = requestAnimationFrame(waitVideo);
        return;
      }
      startPipeline(video);
    };
    waitRafRef.current = requestAnimationFrame(waitVideo);

    return () => {
      alive = false;
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(waitRafRef.current);
      cleanupStream();
      lastTipRef.current = null;
    };
  }, [
    active,
    canvasW,
    canvasH,
    mirror,
    appendHandFlowPoint,
    bumpHandFlowPhase,
    t,
  ]);

  return (
    <div className="hand-mode">
      <video
        ref={videoRef}
        muted
        playsInline
        className="hand-preview-video"
        style={{
          width: "100%",
          maxWidth: 280,
          borderRadius: 8,
          transform: mirror ? "scaleX(-1)" : undefined,
        }}
      />
      {error ? <p className="field-hint err">{error}</p> : null}
      {!active ? (
        <p className="field-hint">{t("hand_hint_idle")}</p>
      ) : null}
    </div>
  );
}
