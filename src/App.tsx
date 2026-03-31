import { useEffect, useRef, useState } from "react";
import { CanvasStage } from "./components/CanvasStage";
import { HandMode } from "./components/HandMode";
import { useI18n } from "./i18n/useI18n";
import type { MessageId } from "./i18n/translations";
import { PRESETS, type PresetKey } from "./lib/canvasPresets";
import { RECOMMENDED_PALETTES } from "./lib/colorPalette";
import { useDesignStore } from "./store/useDesignStore";
import "./App.css";

function palKey(id: string): MessageId {
  return `pal_${id}` as MessageId;
}

function presetLabelKey(k: PresetKey): MessageId {
  return k === "A4" ? "preset_a4" : "preset_a5";
}

type StylePreset = {
  id: "neon_mush" | "forest_haze" | "poster_pop";
  radial: number;
  bg: string;
  colors: string[];
};

const STYLE_PRESETS: StylePreset[] = [
  {
    id: "neon_mush",
    radial: 1.24,
    bg: "#070914",
    colors: ["#8b5cf6", "#ec4899", "#22d3ee", "#f59e0b"],
  },
  {
    id: "forest_haze",
    radial: 0.92,
    bg: "#0f1f1a",
    colors: ["#34d399", "#84cc16", "#22c55e", "#a7f3d0"],
  },
  {
    id: "poster_pop",
    radial: 1.08,
    bg: "#ffffff",
    colors: ["#ef4444", "#f59e0b", "#2563eb", "#111827"],
  },
];

function styleLabelKey(id: StylePreset["id"]): MessageId {
  return `style_${id}` as MessageId;
}

function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function parseHexRgb(hex: string): [number, number, number] {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex.trim());
  if (!m) return [255, 255, 255];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

export default function App() {
  const { t, locale, setLocale } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderChunksRef = useRef<BlobPart[]>([]);
  const recorderTimerRef = useRef<number | null>(null);
  const [camOn, setCamOn] = useState(false);
  const [exportScale, setExportScale] = useState<1 | 2 | 3>(1);
  const [exportTransparent, setExportTransparent] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const [recordFps, setRecordFps] = useState<24 | 30 | 60>(30);
  const [recordFormat, setRecordFormat] = useState<"vp9" | "vp8" | "webm">("vp9");
  const [recordMaxSec, setRecordMaxSec] = useState(20);
  const [booting, setBooting] = useState(true);
  const [activePanel, setActivePanel] = useState<"canvas" | "hand" | "colors" | "export">(
    "canvas"
  );

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    document.title = t("app_title");
  }, [locale, t]);

  useEffect(() => {
    return () => {
      if (recorderTimerRef.current) {
        window.clearInterval(recorderTimerRef.current);
      }
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") {
        rec.stop();
      }
    };
  }, []);

  const preset = useDesignStore((s) => s.preset);
  const setPreset = useDesignStore((s) => s.setPreset);
  const customW = useDesignStore((s) => s.customW);
  const customH = useDesignStore((s) => s.customH);
  const unit = useDesignStore((s) => s.unit);
  const snapEven = useDesignStore((s) => s.snapEven);
  const setCustomFields = useDesignStore((s) => s.setCustomFields);
  const applyCustomSize = useDesignStore((s) => s.applyCustomSize);
  const setCanvasOrientation = useDesignStore((s) => s.setCanvasOrientation);
  const canvasW = useDesignStore((s) => s.canvasW);
  const canvasH = useDesignStore((s) => s.canvasH);
  const canvasBgColor = useDesignStore((s) => s.canvasBgColor);
  const setCanvasBgColor = useDesignStore((s) => s.setCanvasBgColor);

  const radialCircleScale = useDesignStore((s) => s.radialCircleScale);
  const setRadialCircleScale = useDesignStore((s) => s.setRadialCircleScale);

  const colors = useDesignStore((s) => s.colors);
  const setColors = useDesignStore((s) => s.setColors);
  const setColorAt = useDesignStore((s) => s.setColorAt);
  const addColorStop = useDesignStore((s) => s.addColorStop);
  const removeColorStop = useDesignStore((s) => s.removeColorStop);
  const applyRandomColors = useDesignStore((s) => s.applyRandomColors);
  const applyRecommendedPalette = useDesignStore((s) => s.applyRecommendedPalette);

  const clearArt = useDesignStore((s) => s.clearArt);
  const canvasOrientation = canvasW >= canvasH ? "landscape" : "portrait";

  const undoHandFlow = useDesignStore((s) => s.undoHandFlow);
  const redoHandFlow = useDesignStore((s) => s.redoHandFlow);

  const stopRecordTimer = () => {
    if (recorderTimerRef.current) {
      window.clearInterval(recorderTimerRef.current);
      recorderTimerRef.current = null;
    }
  };

  const exportPng = () => {
    const c = canvasRef.current;
    if (!c) return;
    const targetW = Math.round(canvasW * exportScale);
    const targetH = Math.round(canvasH * exportScale);
    const off = document.createElement("canvas");
    off.width = targetW;
    off.height = targetH;
    const ctx = off.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(c, 0, 0, targetW, targetH);
    if (exportTransparent) {
      const [r, g, b] = parseHexRgb(canvasBgColor);
      const img = ctx.getImageData(0, 0, targetW, targetH);
      const data = img.data;
      const fadeStart = 10;
      const fadeEnd = 40;
      for (let p = 0; p < data.length; p += 4) {
        const dr = data[p] - r;
        const dg = data[p + 1] - g;
        const db = data[p + 2] - b;
        const d = Math.hypot(dr, dg, db);
        if (d <= fadeStart) {
          data[p + 3] = 0;
          continue;
        }
        if (d < fadeEnd) {
          // Feather alpha near background color to reduce jagged edges.
          const t = (d - fadeStart) / (fadeEnd - fadeStart);
          data[p + 3] = Math.round(data[p + 3] * t);
        }
      }
      ctx.putImageData(img, 0, 0);
    }
    off.toBlob((blob) => {
      if (blob) downloadBlob(blob, `canvas-${targetW}x${targetH}.png`);
    }, "image/png");
  };

  const startCanvasRecording = () => {
    const c = canvasRef.current;
    if (!c || isRecording || !("MediaRecorder" in window)) return;
    const stream = c.captureStream(recordFps);
    const preferred =
      recordFormat === "vp9"
        ? ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]
        : recordFormat === "vp8"
        ? ["video/webm;codecs=vp8", "video/webm;codecs=vp9", "video/webm"]
        : ["video/webm", "video/webm;codecs=vp8", "video/webm;codecs=vp9"];
    const mimeType = preferred.find((m) => MediaRecorder.isTypeSupported(m));
    let recorder: MediaRecorder;
    try {
      recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    recorderChunksRef.current = [];
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) recorderChunksRef.current.push(ev.data);
    };
    recorder.onstop = () => {
      stopRecordTimer();
      setIsRecording(false);
      const blob = new Blob(recorderChunksRef.current, {
        type: recorder.mimeType || "video/webm",
      });
      if (blob.size > 0) {
        downloadBlob(blob, `canvas-record-${Date.now()}.webm`);
      }
      stream.getTracks().forEach((t) => t.stop());
      recorderRef.current = null;
      recorderChunksRef.current = [];
    };

    recorderRef.current = recorder;
    setRecordSec(0);
    setIsRecording(true);
    recorder.start(240);
    recorderTimerRef.current = window.setInterval(() => {
      setRecordSec((s) => {
        const n = s + 1;
        if (n >= Math.max(3, recordMaxSec)) {
          const rec = recorderRef.current;
          if (rec && rec.state !== "inactive") rec.stop();
        }
        return n;
      });
    }, 1000);
  };

  const stopCanvasRecording = () => {
    const rec = recorderRef.current;
    if (!rec || rec.state === "inactive") return;
    rec.stop();
  };

  if (booting) {
    return (
      <div className="boot-screen">
        <div className="boot-card">
          <h1>{t("app_title")}</h1>
          <p className="boot-loading">{t("boot_loading")}</p>
          <p className="boot-lang-title">{t("boot_choose_lang")}</p>
          <div className="boot-lang-switch" role="group" aria-label="Boot language">
            <button
              type="button"
              className={`btn small ${locale === "zh" ? "primary" : "secondary"}`}
              onClick={() => setLocale("zh")}
            >
              {t("lang_zh")}
            </button>
            <button
              type="button"
              className={`btn small ${locale === "en" ? "primary" : "secondary"}`}
              onClick={() => setLocale("en")}
            >
              {t("lang_en")}
            </button>
          </div>
          <ul className="boot-list">
            <li>{t("boot_feat_1")}</li>
            <li>{t("boot_feat_2")}</li>
            <li>{t("boot_feat_3")}</li>
          </ul>
          <button
            type="button"
            className="btn primary full boot-enter-btn"
            onClick={() => setBooting(false)}
          >
            {t("boot_enter")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-row">
          <div>
            <h1>{t("app_title")}</h1>
            <p className="subtitle">{t("app_subtitle")}</p>
          </div>
          <div className="lang-switch" role="group" aria-label="Language">
            <button
              type="button"
              className={`btn small ${locale === "zh" ? "primary" : "secondary"}`}
              onClick={() => setLocale("zh")}
            >
              {t("lang_zh")}
            </button>
            <button
              type="button"
              className={`btn small ${locale === "en" ? "primary" : "secondary"}`}
              onClick={() => setLocale("en")}
            >
              {t("lang_en")}
            </button>
          </div>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <nav className="sidebar-tabs" aria-label="Sidebar navigation">
            <button
              type="button"
              className={activePanel === "canvas" ? "tab active" : "tab"}
              onClick={() => setActivePanel("canvas")}
            >
              {t("nav_canvas")}
            </button>
            <button
              type="button"
              className={activePanel === "hand" ? "tab active" : "tab"}
              onClick={() => setActivePanel("hand")}
            >
              {t("nav_hand")}
            </button>
            <button
              type="button"
              className={activePanel === "colors" ? "tab active" : "tab"}
              onClick={() => setActivePanel("colors")}
            >
              {t("nav_colors")}
            </button>
            <button
              type="button"
              className={activePanel === "export" ? "tab active" : "tab"}
              onClick={() => setActivePanel("export")}
            >
              {t("nav_export")}
            </button>
          </nav>

          {activePanel === "canvas" && (
            <section className="panel">
            <h2>{t("panel_canvas")}</h2>
            <div className="btn-row wrap">
              {(Object.keys(PRESETS) as PresetKey[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  className={`btn ${preset === k ? "primary" : "secondary"}`}
                  onClick={() => setPreset(k)}
                >
                  {t(presetLabelKey(k))}
                </button>
              ))}
            </div>
            <p className="field-hint">
              {t("canvas_px_hint", { w: canvasW, h: canvasH })}
            </p>
            <div className="field-grid">
              <label className="field">
                <span>{t("field_w")}</span>
                <input
                  type="number"
                  min={1}
                  value={customW}
                  onChange={(e) =>
                    setCustomFields({ customW: Number(e.target.value) || 1 })
                  }
                />
              </label>
              <label className="field">
                <span>{t("field_h")}</span>
                <input
                  type="number"
                  min={1}
                  value={customH}
                  onChange={(e) =>
                    setCustomFields({ customH: Number(e.target.value) || 1 })
                  }
                />
              </label>
              <label className="field">
                <span>{t("field_unit")}</span>
                <select
                  value={unit}
                  onChange={(e) =>
                    setCustomFields({
                      unit: e.target.value as "px" | "mm",
                    })
                  }
                >
                  <option value="mm">{t("opt_mm")}</option>
                  <option value="px">{t("opt_px")}</option>
                </select>
              </label>
              <label className="field">
                <span>{t("field_orientation")}</span>
                <select
                  value={canvasOrientation}
                  onChange={(e) =>
                    setCanvasOrientation(e.target.value as "portrait" | "landscape")
                  }
                >
                  <option value="portrait">{t("orientation_portrait")}</option>
                  <option value="landscape">{t("orientation_landscape")}</option>
                </select>
              </label>
              <label className="field checkbox">
                <input
                  type="checkbox"
                  checked={snapEven}
                  onChange={(e) => setCustomFields({ snapEven: e.target.checked })}
                />
                <span>{t("field_snap_even")}</span>
              </label>
            </div>
            <button
              type="button"
              className="btn secondary full"
              onClick={applyCustomSize}
            >
              {t("btn_apply_custom")}
            </button>
            <label className="field color-field">
              <span>{t("field_canvas_bg")}</span>
              <input
                type="color"
                value={canvasBgColor}
                onChange={(e) => setCanvasBgColor(e.target.value)}
                aria-label={t("field_canvas_bg")}
              />
              <span className="mono swatch-label">{canvasBgColor}</span>
            </label>
          </section>
          )}

          {activePanel === "hand" && (
            <section className="panel">
            <h2>{t("panel_mode")}</h2>
            <p className="field-hint">{t("mode_hand_hint")}</p>
            <button
              type="button"
              className={`btn ${camOn ? "primary" : "secondary"} full`}
              onClick={() => setCamOn((v) => !v)}
            >
              {camOn ? t("cam_on") : t("cam_off")}
            </button>
            <button type="button" className="btn secondary full" onClick={clearArt}>
              {t("btn_clear")}
            </button>
            <div className="btn-row wrap hand-edit-row">
              <button type="button" className="btn secondary hand-edit-btn" onClick={undoHandFlow}>
                {t("hand_undo")}
              </button>
              <button type="button" className="btn secondary hand-edit-btn" onClick={redoHandFlow}>
                {t("hand_redo")}
              </button>
            </div>
            <HandMode active={camOn} />
          </section>
          )}

          {activePanel === "colors" && (
            <section className="panel">
            <h2>{t("panel_gradient")}</h2>
            <p className="field-hint">{t("grad_hint")}</p>
            <label className="field range">
              <span>
                {t("radial_size")} ({Math.round(radialCircleScale * 100)}%)
              </span>
              <input
                type="range"
                min={35}
                max={250}
                step={5}
                value={Math.round(radialCircleScale * 100)}
                onChange={(e) =>
                  setRadialCircleScale(Number(e.target.value) / 100)
                }
              />
            </label>
            <p className="field-hint">{t("radial_size_hint")}</p>
            <label className="field">
              <span>{t("style_preset")}</span>
              <select
                defaultValue=""
                onChange={(e) => {
                  const p = STYLE_PRESETS.find((x) => x.id === e.target.value);
                  if (!p) return;
                  setColors(p.colors);
                  setRadialCircleScale(p.radial);
                  setCanvasBgColor(p.bg);
                  e.target.value = "";
                }}
              >
                <option value="" disabled>
                  {t("style_placeholder")}
                </option>
                {STYLE_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {t(styleLabelKey(p.id))}
                  </option>
                ))}
              </select>
            </label>
            <div className="color-stops">
              {colors.map((c, i) => (
                <div key={i} className="color-row">
                  <input
                    type="color"
                    value={c}
                    onChange={(e) => setColorAt(i, e.target.value)}
                  />
                  <span className="mono">{c}</span>
                  {colors.length > 2 ? (
                    <button
                      type="button"
                      className="btn tiny secondary"
                      onClick={() => removeColorStop(i)}
                    >
                      {t("btn_remove")}
                    </button>
                  ) : null}
                </div>
              ))}
              {colors.length < 4 ? (
                <button
                  type="button"
                  className="btn secondary small"
                  onClick={addColorStop}
                >
                  {t("btn_add_stop")}
                </button>
              ) : null}
            </div>
            <label className="field">
              <span>{t("palette_pick")}</span>
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) applyRecommendedPalette(e.target.value);
                  e.target.value = "";
                }}
              >
                <option value="" disabled>
                  {t("palette_placeholder")}
                </option>
                {RECOMMENDED_PALETTES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {t(palKey(p.id))}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn secondary full"
              onClick={applyRandomColors}
            >
              {t("btn_random_colors")}
            </button>
          </section>
          )}

          {activePanel === "export" && (
            <section className="panel actions">
              <h2>{t("nav_export")}</h2>
              <label className="field">
                <span>{t("export_quality")}</span>
                <select
                  value={exportScale}
                  onChange={(e) =>
                    setExportScale(Number(e.target.value) as 1 | 2 | 3)
                  }
                >
                  <option value={1}>
                    {t("export_scale_1x", { w: canvasW * 1, h: canvasH * 1 })}
                  </option>
                  <option value={2}>
                    {t("export_scale_2x", { w: canvasW * 2, h: canvasH * 2 })}
                  </option>
                  <option value={3}>
                    {t("export_scale_3x", { w: canvasW * 3, h: canvasH * 3 })}
                  </option>
                </select>
                <p className="field-hint">{t("export_quality_hint")}</p>
              </label>
              <label className="field checkbox">
                <input
                  type="checkbox"
                  checked={exportTransparent}
                  onChange={(e) => setExportTransparent(e.target.checked)}
                />
                <span>{t("export_transparent")}</span>
              </label>
              <button type="button" className="btn primary full" onClick={exportPng}>
                {t("btn_export")}
              </button>
              <label className="field">
                <span>{t("rec_fps")}</span>
                <select
                  value={recordFps}
                  onChange={(e) => setRecordFps(Number(e.target.value) as 24 | 30 | 60)}
                >
                  <option value={24}>24 FPS</option>
                  <option value={30}>30 FPS</option>
                  <option value={60}>60 FPS</option>
                </select>
              </label>
              <label className="field">
                <span>{t("rec_format")}</span>
                <select
                  value={recordFormat}
                  onChange={(e) =>
                    setRecordFormat(e.target.value as "vp9" | "vp8" | "webm")
                  }
                >
                  <option value="vp9">WebM VP9</option>
                  <option value="vp8">WebM VP8</option>
                  <option value="webm">WebM Auto</option>
                </select>
              </label>
              <label className="field">
                <span>{t("rec_max_sec")}</span>
                <input
                  type="number"
                  min={3}
                  max={180}
                  value={recordMaxSec}
                  onChange={(e) => setRecordMaxSec(Number(e.target.value) || 20)}
                />
              </label>
              <p className={`field-hint ${isRecording ? "recording" : ""}`}>
                {isRecording
                  ? t("recording_status", { s: recordSec })
                  : t("recording_hint")}
              </p>
              <button
                type="button"
                className={`btn full ${isRecording ? "secondary" : "primary"}`}
                onClick={isRecording ? stopCanvasRecording : startCanvasRecording}
              >
                {isRecording ? t("btn_stop_record") : t("btn_start_record")}
              </button>
            </section>
          )}
        </aside>

        <main className="stage-wrap">
          <div className="stage-scaler">
            <CanvasStage ref={canvasRef} />
          </div>
        </main>
      </div>
    </div>
  );
}
