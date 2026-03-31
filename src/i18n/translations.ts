export type Locale = "zh" | "en";

const zh = {
  app_title: "Mushroom illusion 弥散画布工具",
  app_subtitle:
    "A4 / A5 / 自定义尺寸 · 自选与推荐配色 · 手势脊线径向弥散或图片轮廓填色",
  lang_zh: "中文",
  lang_en: "English",
  boot_loading: "正在进入画布...",
  boot_choose_lang: "请选择语言",
  boot_enter: "进入画布",
  boot_feat_1: "手势驱动弥散脊线，实时预览流动渐变。",
  boot_feat_2: "调节光晕大小、配色和画板背景色。",
  boot_feat_3: "按分辨率导出 1x / 2x / 3x 高清 PNG。",

  panel_canvas: "画布尺寸",
  preset_a4: "A4 (210×297 mm)",
  preset_a5: "A5 (148×210 mm)",
  canvas_px_hint: "当前逻辑像素：{w} × {h}px（96 DPI 换算）",
  field_w: "宽",
  field_h: "高",
  field_unit: "单位",
  field_orientation: "方向",
  orientation_portrait: "竖版",
  orientation_landscape: "横版",
  opt_mm: "毫米",
  opt_px: "像素",
  field_snap_even: "对齐偶数像素",
  btn_apply_custom: "应用自定义尺寸",
  field_canvas_bg: "画板背景色",

  panel_mode: "模式",
  mode_hand: "手势渐变",
  mode_image: "图片轮廓",
  mode_hand_hint:
    "用食指在空中「画」一条看不见的线作为脊线，整幅画布的弥散会沿脊线法线方向起伏，并随手移动速度与相位持续流动；未开摄像头时用内置曲线预览。侧栏「清除内容」可重画脊线；图片模式下会同时移除上传图与轮廓。",
  cam_on: "关闭摄像头",
  cam_off: "开启摄像头",

  panel_gradient: "径向弥散与颜色",
  grad_hint:
    "手势模式：沿隐形脊线法线方向排列的圆形光晕，随手移动与相位流动；可调「光晕大小」。图片模式默认沿剪影边缘「向内渐变」填色，也可切换为多中心径向光斑。",
  radial_size: "光晕大小",
  radial_size_hint: "调节每个光团外圈半径（相对默认大小的倍率）。",

  btn_add_stop: "添加色标",
  btn_remove: "删",
  palette_pick: "推荐色系",
  palette_placeholder: "选择一组…",
  btn_random_colors: "随机和谐色系",
  style_preset: "风格预设",
  style_placeholder: "选择一种风格…",
  style_neon_mush: "霓虹蘑菇",
  style_forest_haze: "森林雾影",
  style_poster_pop: "海报高对比",

  pal_warm: "暖色渐变",
  pal_cool: "冷色海洋",
  pal_neon: "霓虹",
  pal_earth: "大地",
  pal_forest: "森林",
  pal_sunset: "落日",
  pal_mono: "单色灰阶",
  pal_pastel: "莫兰迪 pastel",

  panel_contour: "轮廓参数",
  extract_label: "提取方式",
  extract_auto: "自动（优先剪影主体，必要时改用边缘）",
  extract_silhouette: "剪影（Otsu，主体与背景分界更明显）",
  extract_edge: "边缘线（Sobel，线稿类图）",
  edge_threshold: "边缘强度阈值",
  blur_radius: "模糊半径",
  simplify: "轮廓简化",
  contour_hint:
    "「自动 / 剪影」侧重主体剪影：Otsu 二值 + 闭运算去小缝 + 取最大连通域。线稿请用「边缘线」并调阈值；噪声多可略提高模糊。填色默认从轮廓边缘向内侧渐变。",
  fill_style_label: "轮廓填色",
  fill_inward: "向内渐变（沿剪影边缘）",
  fill_radial: "多中心径向弥散",
  inward_depth: "向内渗透深度",

  export_quality: "导出清晰度",
  export_quality_hint: "仅影响导出分辨率，不改变画布逻辑尺寸。",
  export_scale_1x: "标准（{w} × {h}px）",
  export_scale_2x: "高（{w} × {h}px）",
  export_scale_3x: "超高（{w} × {h}px）",
  export_transparent: "透明背景导出 PNG",
  hand_undo: "撤销轨迹",
  hand_redo: "重做轨迹",
  rec_fps: "录制帧率",
  rec_format: "录制格式",
  rec_max_sec: "最大时长（秒）",
  recording_hint: "录制会导出当前画布动画为 WebM 视频。",
  recording_status: "录制中 {s}s",
  btn_start_record: "开始录制视频",
  btn_stop_record: "停止并导出视频",

  nav_canvas: "画布",
  nav_hand: "手势",
  nav_colors: "颜色",
  nav_export: "导出",

  btn_clear: "清除内容",
  btn_export: "导出 PNG",

  img_drop: "选择或拖拽图片",
  img_reextract: "重新提取轮廓",
  img_sample_colors: "从图片取色",
  img_alt: "上传预览",

  hand_hint_idle:
    "用食指在空中画出脊线，径向光团沿法线起伏并铺满画布；未开摄像头时有默认曲线预览。",

  hand_err_camera: "无法打开摄像头（请使用 HTTPS 或 localhost 并允许摄像头）",
  hand_err_model: "手势模型加载失败",
} as const;

type MsgKey = keyof typeof zh;

const en: Record<MsgKey, string> = {
  app_title: "Mushroom illusion Diffuse Canvas Tool",
  app_subtitle:
    "A4 / A5 / custom size · palettes · hand-guided diffuse flow or image contour fills",
  lang_zh: "中文",
  lang_en: "English",
  boot_loading: "Preparing canvas...",
  boot_choose_lang: "Choose language",
  boot_enter: "Enter canvas",
  boot_feat_1: "Hand-driven diffuse spine with live flowing gradients.",
  boot_feat_2: "Tune glow size, palettes, and canvas background color.",
  boot_feat_3: "Export PNG in 1x / 2x / 3x resolution.",

  panel_canvas: "Canvas size",
  preset_a4: "A4 (210×297 mm)",
  preset_a5: "A5 (148×210 mm)",
  canvas_px_hint: "Logical size: {w} × {h} px (96 DPI)",
  field_w: "Width",
  field_h: "Height",
  field_unit: "Unit",
  field_orientation: "Orientation",
  orientation_portrait: "Portrait",
  orientation_landscape: "Landscape",
  opt_mm: "mm",
  opt_px: "px",
  field_snap_even: "Snap dimensions to even px",
  btn_apply_custom: "Apply custom size",
  field_canvas_bg: "Canvas background",

  panel_mode: "Mode",
  mode_hand: "Hand gradient",
  mode_image: "Image contour",
  mode_hand_hint:
    "Draw an invisible spine in the air with your index finger; the diffuse field ripples along its normal and flows with speed and phase. Without the camera, a built-in curve previews motion. Sidebar “Clear content” resets the spine; in image mode it also removes the upload and contour.",
  cam_on: "Turn camera off",
  cam_off: "Turn camera on",

  panel_gradient: "Radial diffuse & colors",
  grad_hint:
    "Hand mode: glows along the spine normal; adjust “Glow size”. Image mode defaults to an inward gradient from the silhouette edge; switch to multi-center radial blobs in contour settings if you prefer.",
  radial_size: "Glow size",
  radial_size_hint: "Scales the outer radius of each circular glow (vs. default).",

  btn_add_stop: "Add color stop",
  btn_remove: "Del",
  palette_pick: "Recommended palettes",
  palette_placeholder: "Pick a set…",
  btn_random_colors: "Random harmonious colors",
  style_preset: "Style preset",
  style_placeholder: "Choose a style…",
  style_neon_mush: "Neon Mushroom",
  style_forest_haze: "Forest Haze",
  style_poster_pop: "Poster Pop",

  pal_warm: "Warm gradient",
  pal_cool: "Cool ocean",
  pal_neon: "Neon",
  pal_earth: "Earth",
  pal_forest: "Forest",
  pal_sunset: "Sunset",
  pal_mono: "Mono grayscale",
  pal_pastel: "Pastel / Morandi",

  panel_contour: "Contour",
  extract_label: "Extraction",
  extract_auto: "Auto (prefer silhouette, else edge)",
  extract_silhouette: "Silhouette (Otsu)",
  extract_edge: "Edge (Sobel, line art)",
  edge_threshold: "Edge threshold",
  blur_radius: "Blur radius",
  simplify: "Simplify",
  contour_hint:
    "Auto / Silhouette uses Otsu threshold, morphological closing, and the largest foreground blob for a clean subject outline. Line art: use Edge + threshold; add blur if noisy. Fill defaults to inward gradient from the contour.",
  fill_style_label: "Contour fill",
  fill_inward: "Inward gradient (from edge)",
  fill_radial: "Multi-center radial",
  inward_depth: "Inward bleed depth",

  export_quality: "Export quality",
  export_quality_hint: "Controls export resolution; logical canvas size stays the same.",
  export_scale_1x: "Standard ({w} × {h}px)",
  export_scale_2x: "High ({w} × {h}px)",
  export_scale_3x: "Ultra ({w} × {h}px)",
  export_transparent: "Export transparent-background PNG",
  hand_undo: "Undo path",
  hand_redo: "Redo path",
  rec_fps: "Recording FPS",
  rec_format: "Recording format",
  rec_max_sec: "Max duration (sec)",
  recording_hint: "Recording exports current canvas animation as WebM video.",
  recording_status: "Recording {s}s",
  btn_start_record: "Start video recording",
  btn_stop_record: "Stop and export video",

  nav_canvas: "Canvas",
  nav_hand: "Hand",
  nav_colors: "Colors",
  nav_export: "Export",

  btn_clear: "Clear content",
  btn_export: "Export PNG",

  img_drop: "Choose or drop an image",
  img_reextract: "Re-extract contour",
  img_sample_colors: "Sample colors from image",
  img_alt: "Upload preview",

  hand_hint_idle:
    "Draw a spine in the air; radial glows ripple along its normal and fill the canvas. A built-in curve previews motion without the camera.",

  hand_err_camera: "Camera unavailable (use HTTPS or localhost and allow permission)",
  hand_err_model: "Hand model failed to load",
};

export type MessageId = MsgKey;

export const STRINGS: Record<Locale, Record<MessageId, string>> = {
  zh: zh,
  en: en,
};
