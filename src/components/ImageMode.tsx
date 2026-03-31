import { useCallback, useEffect } from "react";
import { useI18n } from "../i18n/useI18n";
import { useDesignStore } from "../store/useDesignStore";
import {
  extractContourFromImageSource,
  sampleDominantColors,
} from "../lib/imageContours";

export function ImageMode() {
  const { t } = useI18n();
  const canvasW = useDesignStore((s) => s.canvasW);
  const canvasH = useDesignStore((s) => s.canvasH);
  const imageElement = useDesignStore((s) => s.imageElement);
  const imageUrl = useDesignStore((s) => s.imageUrl);
  const imageEdgeThreshold = useDesignStore((s) => s.imageEdgeThreshold);
  const imageBlur = useDesignStore((s) => s.imageBlur);
  const imageSimplify = useDesignStore((s) => s.imageSimplify);
  const imageExtractMode = useDesignStore((s) => s.imageExtractMode);
  const setImageContour = useDesignStore((s) => s.setImageContour);
  const setImageUrl = useDesignStore((s) => s.setImageUrl);
  const setImageElement = useDesignStore((s) => s.setImageElement);
  const setColors = useDesignStore((s) => s.setColors);

  const processImage = useCallback(() => {
    const el = useDesignStore.getState().imageElement;
    if (!el || !el.complete || el.naturalWidth === 0) return;
    const { contour } = extractContourFromImageSource(el, canvasW, canvasH, {
      edgeThreshold: imageEdgeThreshold,
      blurRadius: imageBlur,
      simplifyEpsilon: imageSimplify,
      extractMode: imageExtractMode,
    });
    setImageContour(contour);
  }, [
    canvasW,
    canvasH,
    imageEdgeThreshold,
    imageBlur,
    imageSimplify,
    imageExtractMode,
    setImageContour,
  ]);

  useEffect(() => {
    if (imageElement) processImage();
  }, [imageElement, processImage]);

  const onFile = (file: File) => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImageUrl(url);
      setImageElement(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setImageElement(null);
    };
    img.src = url;
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith("image/")) onFile(f);
  };

  const applyColorsFromImage = () => {
    const el = imageElement;
    if (!el || !el.complete) return;
    const cols = sampleDominantColors(el, 4);
    if (cols.length >= 2) setColors(cols);
  };

  return (
    <div className="image-mode">
      <div
        className="drop-zone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <label className="file-label">
          <input
            key={imageUrl ?? "no-image"}
            type="file"
            accept="image/*"
            className="visually-hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
          {t("img_drop")}
        </label>
      </div>
      {imageElement ? (
        <>
          <div className="thumb-wrap">
            <img
              src={imageUrl ?? undefined}
              alt={t("img_alt")}
              className="thumb"
            />
          </div>
          <button type="button" className="btn secondary" onClick={processImage}>
            {t("img_reextract")}
          </button>
          <button type="button" className="btn secondary" onClick={applyColorsFromImage}>
            {t("img_sample_colors")}
          </button>
        </>
      ) : null}
    </div>
  );
}
