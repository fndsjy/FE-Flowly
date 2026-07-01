import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "../components/organisms/MessageToast";
import { apiFetch, getApiErrorMessage } from "../lib/api";
import {
  detectFace,
  detectFaceGeometry,
  loadFaceApiModels,
} from "../features/attendance/faceApiHelper";
import {
  calculateLaplacianVariance,
} from "../features/attendance/liveness";

type AttendanceEmployee = {
  badgeNum: string;
  name: string | null;
};

type FaceSpoofType = "PHOTO" | "VIDEO_REPLAY" | "HANDPHONE" | "PROFILE_MISMATCH";
type FaceAttendanceEventType = "CHECK_IN" | "CHECK_OUT" | "FAILED" | "SPOOF";
type FaceAttendanceScanStatus = "SUCCESS" | "FAILED" | "SPOOF";

type AttendanceViewMode = "scan" | "enroll";
type ScannerStage = "IDLE" | "LOADING" | "ALIGN" | "CHALLENGE" | "SUCCESS" | "FAILED";
type LiveChallenge =
  | "BLINK"
  | "MOUTH"
  | "TURN_LEFT"
  | "TURN_RIGHT"
  | "NOD"
  | "LOOK_UP"
  | "LOOK_DOWN";
type FaceLandmarkPoint = { x: number; y: number; z?: number };
type FaceApiLandmarks = {
  getJawOutline: () => FaceLandmarkPoint[];
  getNose: () => FaceLandmarkPoint[];
  getLeftEye: () => FaceLandmarkPoint[];
  getRightEye: () => FaceLandmarkPoint[];
  getMouth: () => FaceLandmarkPoint[];
};
type LivenessFrame = {
  source: "MP" | "FA";
  faceCount: number;
  box: { x: number; y: number; width: number; height: number };
  eyeOpenScore: number;
  mouthScore: number;
  yaw: number;
  pitch: number;
};
type AlignmentGuidance = {
  key: string;
  status: string;
  voice: string;
};
type AlignmentOptions = {
  centerXMin?: number;
  centerXMax?: number;
  centerYMin?: number;
  centerYMax?: number;
  maxFaceWidthRatio?: number;
};
type MatchCheckResult =
  | {
      matched: true;
      employee: AttendanceEmployee;
      score: number;
    }
  | {
      matched: false;
      message: string;
    };
type AttendanceLog = {
  faceScanLogId: string;
  employeeName: string | null;
  badgeNum: string | null;
  eventType: FaceAttendanceEventType;
  scanStatus: FaceAttendanceScanStatus;
  scanTime: string;
  matchConfidence: number | null;
  livenessPassed: boolean;
  spoofType: FaceSpoofType | null;
  failureReason: string | null;
};
type RegionStats = {
  mean: number;
  variance: number;
  saturationMean: number;
  skinLikeRatio: number;
  darkRatio: number;
};
type EnrollmentFaceMotionSample = {
  centerX: number;
  centerY: number;
  widthRatio: number;
  heightRatio: number;
  noseX: number;
  noseY: number;
  mouthX: number;
  mouthY: number;
};

const CAMERA_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 320, max: 320 },
  height: { ideal: 240, max: 240 },
  frameRate: { ideal: 20, max: 20 },
  facingMode: "user",
};
const ALIGN_PROCESS_INTERVAL_MS = 700;
const CHALLENGE_PROCESS_INTERVAL_MS = 420;
const METRICS_UPDATE_INTERVAL_MS = 500;
const MATCH_CONFIRMATION_FRAMES = 2;
const MATCH_CHECK_INTERVAL_MS = 1400;
const GUIDANCE_SPEAK_INTERVAL_MS = 3500;
const GUIDANCE_SWITCH_SPEAK_INTERVAL_MS = 1400;
const ALIGN_MIN_FACE_WIDTH_RATIO = 0.24;
const CHALLENGE_MIN_FACE_WIDTH_RATIO = 0.18;
const ENROLLMENT_PROCESS_INTERVAL_MS = 450;
const ENROLLMENT_STABLE_FRAMES = 6;
const ENROLLMENT_COUNTDOWN_SECONDS = 3;
const ENROLLMENT_MIN_FACE_WIDTH_RATIO = 0.28;
const ENROLLMENT_MAX_FACE_WIDTH_RATIO = 0.5;
const ENROLLMENT_MIN_SHARPNESS = 12;
const ENROLLMENT_MIN_FACE_BRIGHTNESS = 48;
const ENROLLMENT_MIN_LOWER_FACE_SKIN_RATIO = 0.22;
const ENROLLMENT_MIN_LOWER_CENTER_SKIN_RATIO = 0.24;
const ENROLLMENT_MIN_EYE_OPEN_SCORE = 0.55;
const ENROLLMENT_MIN_NOSE_SKIN_RATIO = 0.22;
const ENROLLMENT_MIN_NOSE_DARK_RATIO = 0.018;
const ENROLLMENT_MIN_NOSE_VARIANCE = 55;
const ENROLLMENT_MIN_MOUTH_SKIN_RATIO = 0.2;
const ENROLLMENT_MIN_MOUTH_DARK_RATIO = 0.045;
const ENROLLMENT_MIN_LOWER_FACE_DARK_RATIO = 0.05;
const ENROLLMENT_MIN_MOUTH_VARIANCE = 130;
const ENROLLMENT_MAX_STABLE_CENTER_DELTA = 0.018;
const ENROLLMENT_MAX_STABLE_SIZE_DELTA = 0.03;
const ENROLLMENT_MAX_STABLE_LANDMARK_DELTA = 0.028;
const MAX_FACE_WIDTH_RATIO = 0.58;
const TURN_DELTA_THRESHOLD = 0.065;
const TURN_MAX_PITCH_DELTA = 0.05;
const TURN_YAW_DOMINANCE_RATIO = 1.15;
const NOD_DELTA_THRESHOLD = 0.04;
const LOOK_DELTA_THRESHOLD = 0.04;
const MOUTH_OPEN_THRESHOLD = 0.1;
const MOUTH_OPEN_DELTA_THRESHOLD = 0.045;
const MOUTH_CONFIRMATION_FRAMES = 2;
const USER_TURN_LEFT_YAW_SIGN = 1;
const USER_TURN_RIGHT_YAW_SIGN = -1;

const challengeLabels: Record<LiveChallenge, string> = {
  BLINK: "Kedipkan mata",
  MOUTH: "Buka mulut",
  TURN_LEFT: "Tengok kiri",
  TURN_RIGHT: "Tengok kanan",
  NOD: "Anggukkan kepala",
  LOOK_UP: "Lihat atas",
  LOOK_DOWN: "Lihat bawah",
};

const eventTypeLabels: Record<FaceAttendanceEventType, string> = {
  CHECK_IN: "Masuk",
  CHECK_OUT: "Pulang",
  FAILED: "Gagal",
  SPOOF: "Spoof",
};

const scanStatusLabels: Record<FaceAttendanceScanStatus, string> = {
  SUCCESS: "Berhasil",
  FAILED: "Gagal",
  SPOOF: "Terblokir",
};

const voiceInstructions: Record<LiveChallenge, string> = {
  BLINK: "Silakan kedipkan mata.",
  MOUTH: "Silakan buka mulut.",
  TURN_LEFT: "Silakan hadap kiri.",
  TURN_RIGHT: "Silakan hadap kanan.",
  NOD: "Silakan anggukkan kepala.",
  LOOK_UP: "Silakan lihat ke atas.",
  LOOK_DOWN: "Silakan lihat ke bawah.",
};

const formatEmployeeName = (employee?: Pick<AttendanceEmployee, "name" | "badgeNum"> | null) =>
  employee?.name?.trim()
    ? `${employee.badgeNum} - ${employee.name.trim()}`
    : employee?.badgeNum || "-";

const formatLogEmployeeName = (log: AttendanceLog) =>
  log.employeeName?.trim()
    ? `${log.badgeNum ?? "-"} - ${log.employeeName.trim()}`
    : log.badgeNum || "-";

const formatLogTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getStatusTone = (status: FaceAttendanceScanStatus) => {
  if (status === "SUCCESS") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "SPOOF") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-rose-200 bg-rose-50 text-rose-700";
};

const clampMetric = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : 0));

const distanceBetween = (a: FaceLandmarkPoint, b: FaceLandmarkPoint) =>
  Math.hypot(a.x - b.x, a.y - b.y);

const getCenterPoint = (points: FaceLandmarkPoint[]) => {
  if (points.length === 0) {
    return null;
  }

  const sum = points.reduce(
    (total, point) => ({ x: total.x + point.x, y: total.y + point.y }),
    { x: 0, y: 0 }
  );

  return { x: sum.x / points.length, y: sum.y / points.length };
};

const getAlignmentGuidance = (
  box: { x: number; y: number; width: number; height: number },
  video: HTMLVideoElement,
  minFaceWidthRatio: number,
  options: AlignmentOptions = {}
): AlignmentGuidance | null => {
  const centerX = (box.x + box.width / 2) / video.videoWidth;
  const centerY = (box.y + box.height / 2) / video.videoHeight;
  const widthRatio = box.width / video.videoWidth;
  const centerXMin = options.centerXMin ?? 0.35;
  const centerXMax = options.centerXMax ?? 0.65;
  const centerYMin = options.centerYMin ?? 0.25;
  const centerYMax = options.centerYMax ?? 0.75;
  const maxFaceWidthRatio = options.maxFaceWidthRatio ?? MAX_FACE_WIDTH_RATIO;

  if (widthRatio < minFaceWidthRatio) {
    return {
      key: "FACE_TOO_FAR",
      status: "Dekatkan wajah ke kamera sampai masuk lingkaran.",
      voice: "Majukan wajah sedikit ke kamera.",
    };
  }

  if (widthRatio > maxFaceWidthRatio) {
    return {
      key: "FACE_TOO_CLOSE",
      status: "Wajah terlalu dekat. Mundur sedikit dari kamera.",
      voice: "Mundurkan wajah sedikit dari kamera.",
    };
  }

  if (centerX < centerXMin || centerX > centerXMax) {
    return {
      key: "FACE_OFF_CENTER_X",
      status: "Geser wajah sampai tepat di tengah lingkaran kamera.",
      voice: "Geser wajah perlahan sampai tepat di tengah lingkaran kamera.",
    };
  }

  if (centerY < centerYMin) {
    return {
      key: "FACE_TOO_HIGH",
      status: "Wajah terlalu tinggi. Turunkan sedikit ke tengah lingkaran.",
      voice: "Turunkan wajah sedikit ke tengah lingkaran kamera.",
    };
  }

  if (centerY > centerYMax) {
    return {
      key: "FACE_TOO_LOW",
      status: "Wajah terlalu rendah. Naikkan sedikit ke tengah lingkaran.",
      voice: "Naikkan wajah sedikit ke tengah lingkaran kamera.",
    };
  }

  return null;
};

const getEnrollmentAlignmentGuidance = (
  box: { x: number; y: number; width: number; height: number },
  video: HTMLVideoElement
) =>
  getAlignmentGuidance(box, video, ENROLLMENT_MIN_FACE_WIDTH_RATIO, {
    centerXMin: 0.42,
    centerXMax: 0.58,
    centerYMin: 0.32,
    centerYMax: 0.68,
    maxFaceWidthRatio: ENROLLMENT_MAX_FACE_WIDTH_RATIO,
  });

const getHue = (red: number, green: number, blue: number) => {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  if (delta === 0) {
    return 0;
  }

  if (max === r) {
    return ((g - b) / delta + (g < b ? 6 : 0)) * 60;
  }

  if (max === g) {
    return ((b - r) / delta + 2) * 60;
  }

  return ((r - g) / delta + 4) * 60;
};

const isSkinLikePixel = (red: number, green: number, blue: number) => {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const saturation = max === 0 ? 0 : (max - min) / max;
  const hue = getHue(red, green, blue);

  return (
    max > 45 &&
    saturation > 0.08 &&
    saturation < 0.78 &&
    (hue <= 55 || hue >= 345) &&
    red >= blue * 0.9 &&
    red >= green * 0.72
  );
};

const getVideoRegionStats = (
  video: HTMLVideoElement,
  rect: { x: number; y: number; width: number; height: number }
): RegionStats | null => {
  const x = Math.max(0, Math.floor(rect.x));
  const y = Math.max(0, Math.floor(rect.y));
  const width = Math.min(video.videoWidth - x, Math.ceil(rect.width));
  const height = Math.min(video.videoHeight - y, Math.ceil(rect.height));

  if (width <= 1 || height <= 1) {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return null;
  }

  ctx.drawImage(video, x, y, width, height, 0, 0, width, height);
  const data = ctx.getImageData(0, 0, width, height).data;
  const step = width * height > 5000 ? 8 : 4;
  let count = 0;
  let luminanceSum = 0;
  let luminanceSquareSum = 0;
  let saturationSum = 0;
  let skinLikeCount = 0;
  let darkCount = 0;

  for (let index = 0; index < data.length; index += step * 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const saturation = max === 0 ? 0 : (max - min) / max;

    count += 1;
    luminanceSum += luminance;
    luminanceSquareSum += luminance * luminance;
    saturationSum += saturation;
    if (isSkinLikePixel(red, green, blue)) {
      skinLikeCount += 1;
    }
    if (luminance < 76) {
      darkCount += 1;
    }
  }

  if (count === 0) {
    return null;
  }

  const mean = luminanceSum / count;
  const variance = Math.max(0, luminanceSquareSum / count - mean * mean);

  return {
    mean,
    variance,
    saturationMean: saturationSum / count,
    skinLikeRatio: skinLikeCount / count,
    darkRatio: darkCount / count,
  };
};

const getBoxRegionStats = (
  video: HTMLVideoElement,
  box: { x: number; y: number; width: number; height: number },
  paddingRatio = 0
) =>
  getVideoRegionStats(video, {
    x: box.x - box.width * paddingRatio,
    y: box.y - box.height * paddingRatio,
    width: box.width * (1 + paddingRatio * 2),
    height: box.height * (1 + paddingRatio * 2),
  });

const getBoxRelativeRegionStats = (
  video: HTMLVideoElement,
  box: { x: number; y: number; width: number; height: number },
  region: { x: number; y: number; width: number; height: number }
) =>
  getVideoRegionStats(video, {
    x: box.x + box.width * region.x,
    y: box.y + box.height * region.y,
    width: box.width * region.width,
    height: box.height * region.height,
  });

const getLandmarkRegionStats = (
  video: HTMLVideoElement,
  points: FaceLandmarkPoint[],
  paddingRatio = 0.4
) => {
  if (points.length === 0) {
    return null;
  }

  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const width = Math.max(8, maxX - minX);
  const height = Math.max(8, maxY - minY);

  return getVideoRegionStats(video, {
    x: minX - width * paddingRatio,
    y: minY - height * paddingRatio,
    width: width * (1 + paddingRatio * 2),
    height: height * (1 + paddingRatio * 2),
  });
};

const getEnrollmentFaceMotionSample = (
  box: { x: number; y: number; width: number; height: number },
  landmarks: FaceApiLandmarks,
  video: HTMLVideoElement
): EnrollmentFaceMotionSample => {
  const noseCenter = getCenterPoint(landmarks.getNose());
  const mouthCenter = getCenterPoint(landmarks.getMouth());
  const fallbackX = box.x + box.width / 2;
  const fallbackY = box.y + box.height / 2;

  return {
    centerX: fallbackX / video.videoWidth,
    centerY: fallbackY / video.videoHeight,
    widthRatio: box.width / video.videoWidth,
    heightRatio: box.height / video.videoHeight,
    noseX: (noseCenter?.x ?? fallbackX) / video.videoWidth,
    noseY: (noseCenter?.y ?? fallbackY) / video.videoHeight,
    mouthX: (mouthCenter?.x ?? fallbackX) / video.videoWidth,
    mouthY: (mouthCenter?.y ?? fallbackY) / video.videoHeight,
  };
};

const getEnrollmentMotionGuidance = (
  current: EnrollmentFaceMotionSample,
  previous: EnrollmentFaceMotionSample | null
): AlignmentGuidance | null => {
  if (!previous) {
    return null;
  }

  const centerDelta = Math.hypot(
    current.centerX - previous.centerX,
    current.centerY - previous.centerY
  );
  const sizeDelta =
    Math.abs(current.widthRatio - previous.widthRatio) +
    Math.abs(current.heightRatio - previous.heightRatio);
  const noseDelta = Math.hypot(current.noseX - previous.noseX, current.noseY - previous.noseY);
  const mouthDelta = Math.hypot(
    current.mouthX - previous.mouthX,
    current.mouthY - previous.mouthY
  );

  if (
    centerDelta > ENROLLMENT_MAX_STABLE_CENTER_DELTA ||
    sizeDelta > ENROLLMENT_MAX_STABLE_SIZE_DELTA ||
    Math.max(noseDelta, mouthDelta) > ENROLLMENT_MAX_STABLE_LANDMARK_DELTA
  ) {
    return {
      key: "FACE_MOVING",
      status: "Wajah masih bergerak. Diam dulu sampai posisi benar-benar stabil.",
      voice: "Wajah masih bergerak. Diam dulu sampai posisi stabil.",
    };
  }

  return null;
};

const getEnrollmentVisibilityGuidance = (
  video: HTMLVideoElement,
  landmarks: FaceApiLandmarks,
  box: { x: number; y: number; width: number; height: number }
): AlignmentGuidance | null => {
  const faceStats = getBoxRegionStats(video, box, 0.04);
  if (faceStats && faceStats.mean < ENROLLMENT_MIN_FACE_BRIGHTNESS) {
    return {
      key: "FACE_LOW_LIGHT",
      status: "Pencahayaan terlalu gelap. Wajah harus terlihat jelas.",
      voice: "Pencahayaan terlalu gelap. Cari tempat yang lebih terang.",
    };
  }

  const faceMetrics = getFaceApiMetrics(landmarks);
  if (faceMetrics.eyeOpenScore < ENROLLMENT_MIN_EYE_OPEN_SCORE) {
    return {
      key: "EYES_NOT_VISIBLE",
      status: "Mata harus terbuka dan terlihat jelas saat daftar wajah.",
      voice: "Mata belum terlihat jelas. Buka mata dan jangan tutup area mata.",
    };
  }

  const leftEyeStats = getLandmarkRegionStats(video, landmarks.getLeftEye(), 0.55);
  const rightEyeStats = getLandmarkRegionStats(video, landmarks.getRightEye(), 0.55);
  if (faceStats && leftEyeStats && rightEyeStats) {
    const eyeMean = (leftEyeStats.mean + rightEyeStats.mean) / 2;
    const bothEyesTooDark =
      eyeMean < 42 &&
      faceStats.mean - eyeMean > 28 &&
      leftEyeStats.skinLikeRatio < 0.08 &&
      rightEyeStats.skinLikeRatio < 0.08;

    if (bothEyesTooDark) {
      return {
        key: "EYES_BLOCKED",
        status: "Area mata harus terlihat jelas. Lepas kacamata hitam atau penutup mata.",
        voice: "Area mata tertutup. Lepas kacamata hitam atau penutup mata.",
      };
    }
  }

  const noseStats = getLandmarkRegionStats(video, landmarks.getNose(), 0.5);
  const noseCenterStats = getBoxRelativeRegionStats(video, box, {
    x: 0.34,
    y: 0.34,
    width: 0.32,
    height: 0.24,
  });
  if (
    noseStats &&
    noseCenterStats &&
    (Math.min(noseStats.skinLikeRatio, noseCenterStats.skinLikeRatio) <
      ENROLLMENT_MIN_NOSE_SKIN_RATIO ||
      Math.max(noseStats.darkRatio, noseCenterStats.darkRatio) <
        ENROLLMENT_MIN_NOSE_DARK_RATIO ||
      Math.max(noseStats.variance, noseCenterStats.variance) < ENROLLMENT_MIN_NOSE_VARIANCE)
  ) {
    return {
      key: "NOSE_NOT_VISIBLE",
      status: "Area hidung harus terlihat jelas. Lepas masker atau penutup hidung.",
      voice: "Area hidung tertutup. Lepas masker atau penutup hidung.",
    };
  }

  const lowerFaceStats = getLandmarkRegionStats(
    video,
    [...landmarks.getNose(), ...landmarks.getMouth()],
    0.55
  );
  const lowerCenterStats = getBoxRelativeRegionStats(video, box, {
    x: 0.24,
    y: 0.48,
    width: 0.52,
    height: 0.38,
  });
  const mouthStats = getLandmarkRegionStats(video, landmarks.getMouth(), 0.45);
  const lowerFaceSkinRatio = Math.min(
    lowerFaceStats?.skinLikeRatio ?? 1,
    lowerCenterStats?.skinLikeRatio ?? 1
  );

  if (lowerFaceSkinRatio < ENROLLMENT_MIN_LOWER_FACE_SKIN_RATIO) {
    return {
      key: "LOWER_FACE_BLOCKED",
      status: "Area hidung dan mulut harus terlihat. Lepas masker, tangan, atau penutup wajah.",
      voice: "Area hidung dan mulut tertutup. Lepas masker atau penutup wajah.",
    };
  }

  if (
    mouthStats &&
    lowerCenterStats &&
    (mouthStats.skinLikeRatio < ENROLLMENT_MIN_MOUTH_SKIN_RATIO ||
      lowerCenterStats.skinLikeRatio < ENROLLMENT_MIN_LOWER_CENTER_SKIN_RATIO)
  ) {
    return {
      key: "MOUTH_COVERED_BY_MASK",
      status: "Area mulut dan bibir harus terlihat. Lepas masker atau penutup wajah.",
      voice: "Area mulut dan bibir tertutup. Lepas masker atau penutup wajah.",
    };
  }

  if (
    mouthStats &&
    lowerCenterStats &&
    mouthStats.variance < ENROLLMENT_MIN_MOUTH_VARIANCE &&
    lowerCenterStats.variance < ENROLLMENT_MIN_MOUTH_VARIANCE &&
    mouthStats.darkRatio < ENROLLMENT_MIN_MOUTH_DARK_RATIO
  ) {
    return {
      key: "MOUTH_AREA_TOO_FLAT",
      status: "Area mulut terlihat polos/tertutup. Pastikan bibir dan bentuk mulut terlihat jelas.",
      voice: "Area mulut terlihat tertutup. Pastikan bibir terlihat jelas.",
    };
  }

  if (
    lowerFaceStats &&
    lowerCenterStats &&
    mouthStats &&
    lowerFaceStats.skinLikeRatio > 0.52 &&
    lowerCenterStats.skinLikeRatio > 0.52 &&
    lowerCenterStats.darkRatio < ENROLLMENT_MIN_LOWER_FACE_DARK_RATIO &&
    mouthStats.darkRatio < ENROLLMENT_MIN_MOUTH_DARK_RATIO
  ) {
    return {
      key: "MOUTH_NOT_VISIBLE",
      status: "Area mulut kurang terlihat. Jangan tutup mulut dengan tangan, masker, atau benda lain.",
      voice: "Area mulut belum terlihat jelas. Jangan tutup mulut dengan tangan atau masker.",
    };
  }

  return null;
};

const getEnrollmentQualityGuidance = (
  video: HTMLVideoElement,
  box: { x: number; y: number; width: number; height: number }
): AlignmentGuidance | null => {
  const sharpness = calculateLaplacianVariance(video, box);

  if (sharpness > 0 && sharpness < ENROLLMENT_MIN_SHARPNESS) {
    return {
      key: "FACE_NOT_CLEAR",
      status: "Wajah kurang jelas. Tahan lebih stabil dan pastikan cahaya cukup.",
      voice: "Wajah kurang jelas. Tahan wajah lebih stabil dan cari cahaya yang lebih terang.",
    };
  }

  return null;
};

const getEyeOpenFromFaceApiEye = (eye: FaceLandmarkPoint[]) => {
  if (eye.length < 6) {
    return null;
  }

  const horizontal = distanceBetween(eye[0], eye[3]);
  if (horizontal <= 0) {
    return null;
  }

  const ratio = (distanceBetween(eye[1], eye[5]) + distanceBetween(eye[2], eye[4])) / (2 * horizontal);
  return clampMetric(ratio * 3.4);
};

const getFaceApiMetrics = (landmarks: FaceApiLandmarks) => {
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  const mouth = landmarks.getMouth();
  const nose = landmarks.getNose();
  const jaw = landmarks.getJawOutline();

  const eyeValues = [getEyeOpenFromFaceApiEye(leftEye), getEyeOpenFromFaceApiEye(rightEye)].filter(
    (value): value is number => value !== null
  );
  const eyeOpenScore =
    eyeValues.length > 0
      ? eyeValues.reduce((total, value) => total + value, 0) / eyeValues.length
      : 0;

  const mouthWidth =
    mouth.length >= 7
      ? distanceBetween(mouth[0], mouth[6])
      : Math.max(...mouth.map((point) => point.x)) - Math.min(...mouth.map((point) => point.x));
  const innerMouthPairs =
    mouth.length >= 20
      ? [
          [mouth[13], mouth[19]],
          [mouth[14], mouth[18]],
          [mouth[15], mouth[17]],
        ]
      : [];
  const mouthOpen =
    mouthWidth > 0 && innerMouthPairs.length > 0
      ? innerMouthPairs.reduce((total, [upper, lower]) => total + distanceBetween(upper, lower), 0) /
        innerMouthPairs.length /
        mouthWidth
      : 0;
  const mouthScore = clampMetric(mouthOpen * 2.8);

  const noseTip = nose[3] ?? nose[Math.floor(nose.length / 2)] ?? null;
  const leftEyeCenter = getCenterPoint(leftEye);
  const rightEyeCenter = getCenterPoint(rightEye);
  const mouthCenter = getCenterPoint(mouth);
  const chin = jaw[8] ?? jaw[Math.floor(jaw.length / 2)] ?? null;

  if (!noseTip || !leftEyeCenter || !rightEyeCenter || !mouthCenter || !chin) {
    return { eyeOpenScore, mouthScore, yaw: 0, pitch: 0 };
  }

  const eyeCenter = {
    x: (leftEyeCenter.x + rightEyeCenter.x) / 2,
    y: (leftEyeCenter.y + rightEyeCenter.y) / 2,
  };
  const eyeSpan = distanceBetween(leftEyeCenter, rightEyeCenter);
  const faceHeight = Math.abs(chin.y - eyeCenter.y);

  return {
    eyeOpenScore,
    mouthScore,
    yaw: eyeSpan > 0 ? (noseTip.x - eyeCenter.x) / eyeSpan : 0,
    pitch: faceHeight > 0 ? (noseTip.y - (eyeCenter.y + mouthCenter.y) / 2) / faceHeight : 0,
  };
};

const getRandomChallenges = () => {
  const pool: LiveChallenge[] = [
    "TURN_LEFT",
    "TURN_RIGHT",
    "NOD",
    "LOOK_UP",
    "LOOK_DOWN",
  ];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }

  return pool.slice(0, 2);
};

const cancelSpeechInstruction = (repeat = false) => {
  if (!("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();
  if (repeat) {
    window.setTimeout(() => window.speechSynthesis.cancel(), 0);
    window.setTimeout(() => window.speechSynthesis.cancel(), 150);
  }
};

const speakInstruction = (text: string) => {
  if (!("speechSynthesis" in window)) {
    return;
  }

  cancelSpeechInstruction();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "id-ID";
  utterance.rate = 0.95;
  utterance.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  const indonesianVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith("id"));
  if (indonesianVoice) {
    utterance.voice = indonesianVoice;
  }

  window.speechSynthesis.resume();
  window.speechSynthesis.speak(utterance);
};

const captureVideoFrame = (video: HTMLVideoElement) => {
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.86);
};

const AbsensiPage = () => {
  const [employees, setEmployees] = useState<AttendanceEmployee[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const [enrollmentBadgeNum, setEnrollmentBadgeNum] = useState("");
  const [enrollmentStatus, setEnrollmentStatus] = useState("Pilih badge number lalu buka kamera.");
  const [enrollmentSubStatus, setEnrollmentSubStatus] = useState(
    "Pastikan wajah terlihat jelas tanpa masker, kacamata hitam, tangan, atau penutup wajah."
  );
  const [enrollmentSaving, setEnrollmentSaving] = useState(false);
  const [enrollmentCameraOpen, setEnrollmentCameraOpen] = useState(false);
  const [enrollmentCountdown, setEnrollmentCountdown] = useState<number | null>(null);
  const [enrollmentCapturedImage, setEnrollmentCapturedImage] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<AttendanceViewMode>("scan");

  const [scannerStage, setScannerStage] = useState<ScannerStage>("IDLE");
  const scannerStageRef = useRef<ScannerStage>("IDLE");
  const [scannerStatus, setScannerStatus] = useState("Scanner siap digunakan");
  const [scannerSubStatus, setScannerSubStatus] = useState("Buka kamera untuk mulai absensi wajah.");
  const [matchedEmployee, setMatchedEmployee] = useState<AttendanceEmployee | null>(null);
  const [matchedScore, setMatchedScore] = useState(0);
  const [challengeStep, setChallengeStep] = useState(0);
  const [challengeTotal, setChallengeTotal] = useState(2);
  const [activeChallenge, setActiveChallenge] = useState<LiveChallenge | null>(null);
  const [, setMetrics] = useState({
    source: "-",
    face: 0,
    eye: 0,
    mouth: 0,
    yaw: 0,
    pitch: 0,
    sharpness: 0,
  });
  const scannerVideoRef = useRef<HTMLVideoElement>(null);
  const enrollmentVideoRef = useRef<HTMLVideoElement>(null);
  const scannerStreamRef = useRef<MediaStream | null>(null);
  const enrollmentStreamRef = useRef<MediaStream | null>(null);
  const scannerFrameRef = useRef<number | null>(null);
  const enrollmentTimerRef = useRef<number | null>(null);
  const enrollmentProcessingRef = useRef(false);
  const enrollmentLastCheckRef = useRef(0);
  const enrollmentStableFramesRef = useRef(0);
  const enrollmentCountdownStartedAtRef = useRef(0);
  const enrollmentLastCountdownRef = useRef<number | null>(null);
  const enrollmentRunIdRef = useRef(0);
  const enrollmentVoiceEnabledRef = useRef(false);
  const enrollmentAutoStartRef = useRef(false);
  const enrollmentLastMotionSampleRef = useRef<EnrollmentFaceMotionSample | null>(null);
  const lastEnrollmentGuidanceKeyRef = useRef("");
  const lastEnrollmentGuidanceSpokenAtRef = useRef(0);
  const scannerProcessingRef = useRef(false);
  const scannerLastCheckRef = useRef(0);
  const scannerStartedAtRef = useRef(0);
  const scannerMetricsLastUpdateRef = useRef(0);
  const consecutiveMatchRef = useRef(0);
  const matchedEmployeeRef = useRef<AttendanceEmployee | null>(null);
  const matchedScoreRef = useRef(0);
  const challengeSequenceRef = useRef<LiveChallenge[]>([]);
  const challengeIndexRef = useRef(0);
  const blinkStageRef = useRef<"open" | "closed">("open");
  const earRecentRef = useRef<number[]>([]);
  const pitchBaselineRef = useRef(0);
  const pitchBaselineFramesRef = useRef(0);
  const yawBaselineRef = useRef(0);
  const yawBaselineFramesRef = useRef(0);
  const yawFrameCountRef = useRef(0);
  const pitchFrameCountRef = useRef(0);
  const neutralFramesRef = useRef(0);
  const mouthBaselineRef = useRef(0);
  const mouthFrameCountRef = useRef(0);
  const blurFrameCountRef = useRef(0);
  const lastSpokenInstructionRef = useRef("");
  const lastGuidanceKeyRef = useRef("");
  const lastGuidanceSpokenAtRef = useRef(0);
  const lastMatchCheckAtRef = useRef(0);
  const scannerLoggedRef = useRef(false);
  const scannerVoiceEnabledRef = useRef(false);
  const scannerRunIdRef = useRef(0);

  const fetchAttendanceData = useCallback(async () => {
    setLoading(true);
    try {
      const [employeeResult, logResult] = await Promise.allSettled([
        apiFetch("/attendance-face/employees", {
          credentials: "include",
          suppressUnauthorizedRedirect: true,
        }).then(async (res) => ({ res, json: await res.json() })),
        apiFetch("/attendance-face/logs?limit=30", {
          credentials: "include",
          suppressUnauthorizedRedirect: true,
        }).then(async (res) => ({ res, json: await res.json() })),
      ]);

      if (employeeResult.status === "rejected") {
        console.error("Failed to load attendance employees", employeeResult.reason);
        setEmployees([]);
        showToast("Gagal memuat karyawan absensi.", "error");
      } else {
        const { res: employeeRes, json: employeeJson } = employeeResult.value;
        if (!employeeRes.ok) {
          setEmployees([]);
          showToast(getApiErrorMessage(employeeJson, "Gagal memuat karyawan absensi."), "error");
        } else {
          setEmployees(Array.isArray(employeeJson?.response) ? employeeJson.response : []);
        }
      }

      if (logResult.status === "rejected") {
        console.error("Failed to load attendance logs", logResult.reason);
        setAttendanceLogs([]);
      } else {
        const { res: logRes, json: logJson } = logResult.value;
        if (!logRes.ok) {
          console.error("Failed to load attendance logs", logJson);
          setAttendanceLogs([]);
        } else {
          setAttendanceLogs(Array.isArray(logJson?.response) ? logJson.response : []);
        }
      }
    } catch (error) {
      console.error("Failed to load attendance data", error);
      showToast("Gagal memuat data absensi wajah.", "error");
      setEmployees([]);
      setAttendanceLogs([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAttendanceData();
  }, [fetchAttendanceData]);

  const stopScannerStream = useCallback(() => {
    scannerRunIdRef.current += 1;
    scannerVoiceEnabledRef.current = false;
    lastSpokenInstructionRef.current = "";
    lastGuidanceKeyRef.current = "";
    lastGuidanceSpokenAtRef.current = 0;

    if (scannerFrameRef.current) {
      cancelAnimationFrame(scannerFrameRef.current);
      scannerFrameRef.current = null;
    }

    cancelSpeechInstruction(true);

    const video = scannerVideoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
      video.removeAttribute("src");
      video.load();
    }

    if (scannerStreamRef.current) {
      scannerStreamRef.current.getTracks().forEach((track) => {
        track.enabled = false;
        track.stop();
      });
      scannerStreamRef.current = null;
    }

    scannerProcessingRef.current = false;
  }, []);

  const stopEnrollmentCapture = useCallback((resetSaving = true) => {
    enrollmentRunIdRef.current += 1;

    if (enrollmentTimerRef.current !== null) {
      window.clearInterval(enrollmentTimerRef.current);
      enrollmentTimerRef.current = null;
    }

    enrollmentProcessingRef.current = false;
    enrollmentLastCheckRef.current = 0;
    enrollmentStableFramesRef.current = 0;
    enrollmentCountdownStartedAtRef.current = 0;
    enrollmentLastCountdownRef.current = null;
    enrollmentLastMotionSampleRef.current = null;
    setEnrollmentCountdown(null);

    if (resetSaving) {
      setEnrollmentSaving(false);
    }
  }, []);

  const stopEnrollmentStream = useCallback(() => {
    stopEnrollmentCapture();
    enrollmentVoiceEnabledRef.current = false;
    enrollmentAutoStartRef.current = false;
    lastEnrollmentGuidanceKeyRef.current = "";
    lastEnrollmentGuidanceSpokenAtRef.current = 0;

    const video = enrollmentVideoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
      video.removeAttribute("src");
      video.load();
    }

    if (enrollmentStreamRef.current) {
      enrollmentStreamRef.current.getTracks().forEach((track) => {
        track.enabled = false;
        track.stop();
      });
      enrollmentStreamRef.current = null;
    }

    setEnrollmentCameraOpen(false);
  }, [stopEnrollmentCapture]);

  useEffect(() => {
    return () => {
      stopScannerStream();
      stopEnrollmentStream();
    };
  }, [stopEnrollmentStream, stopScannerStream]);

  const updateScannerStage = useCallback((stage: ScannerStage) => {
    scannerStageRef.current = stage;
    setScannerStage(stage);
  }, []);

  const resetScanner = useCallback(() => {
    stopScannerStream();
    updateScannerStage("IDLE");
    setScannerStatus("Scanner siap digunakan");
    setScannerSubStatus("Buka kamera untuk mulai absensi wajah.");
    setMatchedEmployee(null);
    setMatchedScore(0);
    setActiveChallenge(null);
    setChallengeStep(0);
    setChallengeTotal(2);
    setMetrics({ source: "-", face: 0, eye: 0, mouth: 0, yaw: 0, pitch: 0, sharpness: 0 });
    matchedEmployeeRef.current = null;
    matchedScoreRef.current = 0;
    scannerMetricsLastUpdateRef.current = 0;
    lastSpokenInstructionRef.current = "";
    lastGuidanceKeyRef.current = "";
    lastGuidanceSpokenAtRef.current = 0;
    lastMatchCheckAtRef.current = 0;
    scannerLoggedRef.current = false;
  }, [stopScannerStream, updateScannerStage]);

  const switchMode = useCallback(
    (mode: AttendanceViewMode) => {
      setActiveMode(mode);
      if (mode === "scan") {
        stopEnrollmentStream();
        return;
      }

      resetScanner();
    },
    [resetScanner, stopEnrollmentStream]
  );

  const resetChallengeMotion = useCallback(() => {
    blinkStageRef.current = "open";
    earRecentRef.current = [];
    pitchBaselineRef.current = 0;
    pitchBaselineFramesRef.current = 0;
    yawBaselineRef.current = 0;
    yawBaselineFramesRef.current = 0;
    yawFrameCountRef.current = 0;
    pitchFrameCountRef.current = 0;
    neutralFramesRef.current = 0;
    mouthBaselineRef.current = 0;
    mouthFrameCountRef.current = 0;
    blurFrameCountRef.current = 0;
  }, []);

  const speakScannerInstruction = useCallback((text: string, runId = scannerRunIdRef.current) => {
    if (!scannerVoiceEnabledRef.current || runId !== scannerRunIdRef.current) {
      cancelSpeechInstruction();
      return;
    }

    speakInstruction(text);
  }, []);

  const announceScannerGuidance = useCallback(
    (key: string, text: string, runId = scannerRunIdRef.current) => {
      if (!scannerVoiceEnabledRef.current || runId !== scannerRunIdRef.current) {
        cancelSpeechInstruction();
        return;
      }

      const now = Date.now();
      if (
        lastGuidanceKeyRef.current === key &&
        now - lastGuidanceSpokenAtRef.current < GUIDANCE_SPEAK_INTERVAL_MS
      ) {
        return;
      }

      lastGuidanceKeyRef.current = key;
      lastGuidanceSpokenAtRef.current = now;
      speakScannerInstruction(text, runId);
    },
    [speakScannerInstruction]
  );

  const isScannerRunActive = useCallback(
    (runId: number) => scannerVoiceEnabledRef.current && scannerRunIdRef.current === runId,
    []
  );

  const announceChallenge = useCallback((challenge: LiveChallenge, index: number, total: number) => {
    if (!scannerVoiceEnabledRef.current) {
      cancelSpeechInstruction();
      return;
    }

    const key = `${index}:${challenge}`;
    if (lastSpokenInstructionRef.current === key) {
      return;
    }

    lastSpokenInstructionRef.current = key;
    speakScannerInstruction(`Langkah ${index + 1} dari ${total}. ${voiceInstructions[challenge]}`);
  }, [speakScannerInstruction]);

  const speakEnrollmentInstruction = useCallback((text: string, runId = enrollmentRunIdRef.current) => {
    if (!enrollmentVoiceEnabledRef.current || runId !== enrollmentRunIdRef.current) {
      return;
    }

    speakInstruction(text);
  }, []);

  const announceEnrollmentGuidance = useCallback(
    (key: string, text: string, runId = enrollmentRunIdRef.current) => {
      if (!enrollmentVoiceEnabledRef.current || runId !== enrollmentRunIdRef.current) {
        return;
      }

      const now = Date.now();
      const lastKey = lastEnrollmentGuidanceKeyRef.current;
      const elapsed = now - lastEnrollmentGuidanceSpokenAtRef.current;
      if (lastKey === key && elapsed < GUIDANCE_SPEAK_INTERVAL_MS) {
        return;
      }
      if (lastKey !== key && elapsed < GUIDANCE_SWITCH_SPEAK_INTERVAL_MS) {
        return;
      }

      lastEnrollmentGuidanceKeyRef.current = key;
      lastEnrollmentGuidanceSpokenAtRef.current = now;
      speakEnrollmentInstruction(text, runId);
    },
    [speakEnrollmentInstruction]
  );

  const startEnrollmentCamera = useCallback(async () => {
    const badgeNum = enrollmentBadgeNum.trim();
    if (!badgeNum) {
      showToast("Isi badge number dulu.", "error");
      return;
    }

    try {
      setActiveMode("enroll");
      stopScannerStream();
      stopEnrollmentStream();
      enrollmentVoiceEnabledRef.current = true;
      enrollmentAutoStartRef.current = false;
      lastEnrollmentGuidanceKeyRef.current = "";
      lastEnrollmentGuidanceSpokenAtRef.current = 0;
      setEnrollmentCapturedImage(null);
      const runId = enrollmentRunIdRef.current;
      setEnrollmentStatus("Memuat kamera daftar wajah");
      setEnrollmentSubStatus("Wajah harus jelas tanpa masker, kacamata hitam, tangan, atau penutup wajah.");
      speakEnrollmentInstruction(
        "Mode daftar wajah dimulai. Pastikan wajah jelas tanpa masker atau penutup wajah.",
        runId
      );

      await loadFaceApiModels();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: CAMERA_CONSTRAINTS,
      });

      enrollmentStreamRef.current = stream;
      if (enrollmentVideoRef.current) {
        enrollmentVideoRef.current.srcObject = stream;
        enrollmentVideoRef.current.muted = true;
        enrollmentVideoRef.current.playsInline = true;
        await enrollmentVideoRef.current.play().catch(() => undefined);
      }

      setEnrollmentCameraOpen(true);
      setEnrollmentStatus("Kamera daftar wajah aktif");
      setEnrollmentSubStatus("Proses daftar berjalan otomatis. Posisikan wajah jelas di tengah lingkaran.");
    } catch (error) {
      console.error("Enrollment camera failed", error);
      setEnrollmentStatus("Kamera daftar wajah gagal dibuka");
      setEnrollmentSubStatus("Periksa izin kamera browser dan coba lagi.");
      stopEnrollmentStream();
    }
  }, [
    enrollmentBadgeNum,
    showToast,
    speakEnrollmentInstruction,
    stopEnrollmentStream,
    stopScannerStream,
  ]);

  const saveEnrollment = useCallback(async () => {
    const badgeNum = enrollmentBadgeNum.trim();
    const video = enrollmentVideoRef.current;
    if (!badgeNum) {
      showToast("Isi badge number dulu.", "error");
      return;
    }

    if (!video || !enrollmentCameraOpen) {
      showToast("Buka kamera daftar wajah dulu.", "error");
      return;
    }

    if (enrollmentSaving) {
      return;
    }

    stopEnrollmentCapture(false);
    setEnrollmentSaving(true);
    const runId = enrollmentRunIdRef.current + 1;
    enrollmentRunIdRef.current = runId;
    enrollmentStableFramesRef.current = 0;
    enrollmentCountdownStartedAtRef.current = 0;
    enrollmentLastCountdownRef.current = null;
    enrollmentLastCheckRef.current = 0;
    enrollmentLastMotionSampleRef.current = null;
    enrollmentVoiceEnabledRef.current = true;
    lastEnrollmentGuidanceKeyRef.current = "";
    lastEnrollmentGuidanceSpokenAtRef.current = 0;
    setEnrollmentCapturedImage(null);
    setEnrollmentCountdown(null);
    setEnrollmentStatus("Pas kan wajah ke lingkaran");
    setEnrollmentSubStatus(
      "Wajah harus berada tepat di tengah lingkaran, jelas, dan tidak tertutup sebelum hitungan mundur dimulai."
    );
    speakEnrollmentInstruction(
      "Pas kan wajah ke tengah lingkaran kamera. Pastikan wajah jelas dan tidak tertutup. Setelah pas, tahan posisi.",
      runId
    );

    const finishEnrollment = async () => {
      const currentVideo = enrollmentVideoRef.current;
      if (!currentVideo || enrollmentRunIdRef.current !== runId) {
        return;
      }

      setEnrollmentCountdown(null);
      setEnrollmentStatus("Mengecek wajah");
      setEnrollmentSubStatus("Mengecek posisi terakhir sebelum foto profile diambil...");
      speakEnrollmentInstruction("Mengecek posisi terakhir.", runId);

      const face = await detectFace(currentVideo);
      if (enrollmentRunIdRef.current !== runId) {
        return;
      }

      if (!face) {
        enrollmentStableFramesRef.current = 0;
        enrollmentCountdownStartedAtRef.current = 0;
        enrollmentLastCountdownRef.current = null;
        enrollmentLastMotionSampleRef.current = null;
        setEnrollmentStatus("Wajah belum terbaca");
        setEnrollmentSubStatus("Pas kan kembali wajah ke tengah lingkaran, lalu tahan posisi.");
        announceEnrollmentGuidance(
          "NO_FACE",
          "Wajah belum terbaca. Arahkan wajah ke kamera sampai masuk lingkaran.",
          runId
        );
        return;
      }

      const alignmentGuidance = getEnrollmentAlignmentGuidance(face.detection.box, currentVideo);
      if (alignmentGuidance) {
        enrollmentStableFramesRef.current = 0;
        enrollmentCountdownStartedAtRef.current = 0;
        enrollmentLastCountdownRef.current = null;
        enrollmentLastMotionSampleRef.current = null;
        setEnrollmentStatus("Posisi berubah");
        setEnrollmentSubStatus(`${alignmentGuidance.status} Hitungan mundur diulang.`);
        announceEnrollmentGuidance(alignmentGuidance.key, alignmentGuidance.voice, runId);
        return;
      }

      const visibilityGuidance = getEnrollmentVisibilityGuidance(
        currentVideo,
        face.landmarks,
        face.detection.box
      );
      if (visibilityGuidance) {
        enrollmentStableFramesRef.current = 0;
        enrollmentCountdownStartedAtRef.current = 0;
        enrollmentLastCountdownRef.current = null;
        enrollmentLastMotionSampleRef.current = null;
        setEnrollmentStatus("Wajah tertutup");
        setEnrollmentSubStatus(`${visibilityGuidance.status} Hitungan mundur diulang.`);
        announceEnrollmentGuidance(visibilityGuidance.key, visibilityGuidance.voice, runId);
        return;
      }

      const qualityGuidance = getEnrollmentQualityGuidance(currentVideo, face.detection.box);
      if (qualityGuidance) {
        enrollmentStableFramesRef.current = 0;
        enrollmentCountdownStartedAtRef.current = 0;
        enrollmentLastCountdownRef.current = null;
        enrollmentLastMotionSampleRef.current = null;
        setEnrollmentStatus("Wajah kurang jelas");
        setEnrollmentSubStatus(`${qualityGuidance.status} Hitungan mundur diulang.`);
        announceEnrollmentGuidance(qualityGuidance.key, qualityGuidance.voice, runId);
        return;
      }

      const motionSample = getEnrollmentFaceMotionSample(
        face.detection.box,
        face.landmarks,
        currentVideo
      );
      const motionGuidance = getEnrollmentMotionGuidance(
        motionSample,
        enrollmentLastMotionSampleRef.current
      );
      enrollmentLastMotionSampleRef.current = motionSample;
      if (motionGuidance) {
        enrollmentStableFramesRef.current = 0;
        enrollmentCountdownStartedAtRef.current = 0;
        enrollmentLastCountdownRef.current = null;
        setEnrollmentCountdown(null);
        setEnrollmentStatus("Wajah belum stabil");
        setEnrollmentSubStatus(`${motionGuidance.status} Hitungan mundur diulang.`);
        announceEnrollmentGuidance(motionGuidance.key, motionGuidance.voice, runId);
        return;
      }

      const faceImage = captureVideoFrame(currentVideo);
      if (!faceImage) {
        enrollmentStableFramesRef.current = 0;
        enrollmentCountdownStartedAtRef.current = 0;
        enrollmentLastCountdownRef.current = null;
        enrollmentLastMotionSampleRef.current = null;
        setEnrollmentStatus("Foto belum bisa diambil");
        setEnrollmentSubStatus("Kamera belum siap mengambil foto. Tahan posisi dan coba lagi.");
        announceEnrollmentGuidance(
          "CAPTURE_NOT_READY",
          "Kamera belum siap mengambil foto. Tahan posisi sebentar.",
          runId
        );
        return;
      }

      setEnrollmentCapturedImage(faceImage);
      setEnrollmentStatus("Mengambil foto profile");
      setEnrollmentSubStatus("Cekrek. Menyimpan foto dan profile wajah...");
      speakEnrollmentInstruction("Cekrek. Menyimpan profile wajah.", runId);

      try {
        const res = await apiFetch("/attendance-face/enroll", {
          method: "POST",
          credentials: "include",
          suppressUnauthorizedRedirect: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            badgeNum,
            faceDescriptor: Array.from(face.descriptor),
            faceImage,
          }),
        });
        const json = await res.json();

        if (!res.ok) {
          setEnrollmentStatus("Daftar wajah gagal");
          setEnrollmentSubStatus(getApiErrorMessage(json, "Gagal menyimpan profile wajah."));
          return;
        }

        const employee = json?.response;
        const displayName =
          employee?.name && employee?.badgeNum
            ? `${employee.badgeNum} - ${employee.name}`
            : badgeNum;
        setEnrollmentStatus("Daftar wajah berhasil");
        setEnrollmentSubStatus(`${displayName} sudah tersimpan untuk absensi wajah.`);
        speakEnrollmentInstruction("Profile wajah berhasil disimpan.", runId);
        stopEnrollmentStream();
        await fetchAttendanceData();
      } catch (error) {
        console.error("Enrollment save failed", error);
        setEnrollmentStatus("Daftar wajah gagal");
        setEnrollmentSubStatus("Koneksi ke server gagal saat menyimpan profile wajah.");
      } finally {
        stopEnrollmentCapture();
      }
    };

    const processEnrollmentFrame = async () => {
      if (enrollmentRunIdRef.current !== runId || enrollmentProcessingRef.current) {
        return;
      }

      const now = Date.now();
      if (now - enrollmentLastCheckRef.current < ENROLLMENT_PROCESS_INTERVAL_MS) {
        return;
      }

      enrollmentLastCheckRef.current = now;
      enrollmentProcessingRef.current = true;

      try {
        const currentVideo = enrollmentVideoRef.current;
        if (!currentVideo || currentVideo.videoWidth === 0 || currentVideo.readyState < 2) {
          return;
        }

        const face = await detectFace(currentVideo);
        if (enrollmentRunIdRef.current !== runId) {
          return;
        }

        if (!face) {
          enrollmentStableFramesRef.current = 0;
          enrollmentCountdownStartedAtRef.current = 0;
          enrollmentLastCountdownRef.current = null;
          enrollmentLastMotionSampleRef.current = null;
          setEnrollmentCountdown(null);
          setEnrollmentStatus("Wajah belum terbaca");
          setEnrollmentSubStatus("Posisikan wajah di dalam lingkaran kamera.");
          announceEnrollmentGuidance(
            "NO_FACE",
            "Wajah belum terbaca. Arahkan wajah ke kamera sampai masuk lingkaran.",
            runId
          );
          return;
        }

        const alignmentGuidance = getEnrollmentAlignmentGuidance(face.detection.box, currentVideo);
        if (alignmentGuidance) {
          enrollmentStableFramesRef.current = 0;
          enrollmentCountdownStartedAtRef.current = 0;
          enrollmentLastCountdownRef.current = null;
          enrollmentLastMotionSampleRef.current = null;
          setEnrollmentCountdown(null);
          setEnrollmentStatus("Pas kan wajah ke lingkaran");
          setEnrollmentSubStatus(alignmentGuidance.status);
          announceEnrollmentGuidance(alignmentGuidance.key, alignmentGuidance.voice, runId);
          return;
        }

        const visibilityGuidance = getEnrollmentVisibilityGuidance(
          currentVideo,
          face.landmarks,
          face.detection.box
        );
        if (visibilityGuidance) {
          enrollmentStableFramesRef.current = 0;
          enrollmentCountdownStartedAtRef.current = 0;
          enrollmentLastCountdownRef.current = null;
          enrollmentLastMotionSampleRef.current = null;
          setEnrollmentCountdown(null);
          setEnrollmentStatus("Wajah tertutup");
          setEnrollmentSubStatus(visibilityGuidance.status);
          announceEnrollmentGuidance(visibilityGuidance.key, visibilityGuidance.voice, runId);
          return;
        }

        const qualityGuidance = getEnrollmentQualityGuidance(currentVideo, face.detection.box);
        if (qualityGuidance) {
          enrollmentStableFramesRef.current = 0;
          enrollmentCountdownStartedAtRef.current = 0;
          enrollmentLastCountdownRef.current = null;
          enrollmentLastMotionSampleRef.current = null;
          setEnrollmentCountdown(null);
          setEnrollmentStatus("Wajah kurang jelas");
          setEnrollmentSubStatus(qualityGuidance.status);
          announceEnrollmentGuidance(qualityGuidance.key, qualityGuidance.voice, runId);
          return;
        }

        const motionSample = getEnrollmentFaceMotionSample(
          face.detection.box,
          face.landmarks,
          currentVideo
        );
        const motionGuidance = getEnrollmentMotionGuidance(
          motionSample,
          enrollmentLastMotionSampleRef.current
        );
        enrollmentLastMotionSampleRef.current = motionSample;
        if (motionGuidance) {
          enrollmentStableFramesRef.current = 0;
          enrollmentCountdownStartedAtRef.current = 0;
          enrollmentLastCountdownRef.current = null;
          setEnrollmentCountdown(null);
          setEnrollmentStatus("Wajah belum stabil");
          setEnrollmentSubStatus(motionGuidance.status);
          announceEnrollmentGuidance(motionGuidance.key, motionGuidance.voice, runId);
          return;
        }

        enrollmentStableFramesRef.current += 1;

        if (enrollmentStableFramesRef.current < ENROLLMENT_STABLE_FRAMES) {
          setEnrollmentCountdown(null);
          setEnrollmentStatus("Menunggu wajah stabil");
          setEnrollmentSubStatus("Jangan bergerak. Sistem menunggu wajah benar-benar stabil.");
          announceEnrollmentGuidance(
            "FACE_READY",
            "Posisi sudah pas. Jangan bergerak sampai wajah benar-benar stabil.",
            runId
          );
          return;
        }

        if (enrollmentCountdownStartedAtRef.current === 0) {
          enrollmentCountdownStartedAtRef.current = now;
          enrollmentLastCountdownRef.current = null;
        }

        const elapsedSeconds = Math.floor((now - enrollmentCountdownStartedAtRef.current) / 1000);
        const countdown = ENROLLMENT_COUNTDOWN_SECONDS - elapsedSeconds;

        if (countdown > 0) {
          setEnrollmentCountdown(countdown);
          setEnrollmentStatus(`Tahan posisi ${countdown}`);
          setEnrollmentSubStatus("Jangan bergerak sampai foto profile diambil.");
          if (enrollmentLastCountdownRef.current !== countdown) {
            enrollmentLastCountdownRef.current = countdown;
            speakEnrollmentInstruction(String(countdown), runId);
          }
          return;
        }

        await finishEnrollment();
      } finally {
        enrollmentProcessingRef.current = false;
      }
    };

    enrollmentTimerRef.current = window.setInterval(() => {
      void processEnrollmentFrame();
    }, 120);
  }, [
    enrollmentBadgeNum,
    enrollmentCameraOpen,
    enrollmentSaving,
    announceEnrollmentGuidance,
    fetchAttendanceData,
    showToast,
    speakEnrollmentInstruction,
    stopEnrollmentCapture,
    stopEnrollmentStream,
  ]);

  useEffect(() => {
    if (!enrollmentCameraOpen || enrollmentSaving || enrollmentAutoStartRef.current) {
      return;
    }

    enrollmentAutoStartRef.current = true;
    void saveEnrollment();
  }, [enrollmentCameraOpen, enrollmentSaving, saveEnrollment]);

  const recordScannerFailure = useCallback(
    async (
      scanStatus: "FAILED" | "SPOOF",
      failureReason: string,
      spoofType?: FaceSpoofType
    ) => {
      if (scannerLoggedRef.current) {
        return;
      }

      scannerLoggedRef.current = true;
      try {
        await apiFetch("/attendance-face/scan-failure", {
          method: "POST",
          credentials: "include",
          suppressUnauthorizedRedirect: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scanStatus,
            spoofType: spoofType ?? null,
            failureReason,
          }),
        });
        await fetchAttendanceData();
      } catch (error) {
        console.error("Failed to record scanner failure", error);
      }
    },
    [fetchAttendanceData]
  );

  const checkFaceProfileMatch = useCallback(async (faceDescriptor: Float32Array): Promise<MatchCheckResult> => {
    try {
      const res = await apiFetch("/attendance-face/match-profile", {
        method: "POST",
        credentials: "include",
        suppressUnauthorizedRedirect: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          faceDescriptor: Array.from(faceDescriptor),
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        return {
          matched: false,
          message: getApiErrorMessage(json, "Wajah belum cocok dengan profile karyawan terdaftar."),
        };
      }

      const match = json?.response;
      if (typeof match?.badgeNum !== "string") {
        return {
          matched: false,
          message: "Response kecocokan wajah tidak valid.",
        };
      }

      return {
        matched: true,
        employee: {
          badgeNum: match.badgeNum,
          name: typeof match.name === "string" ? match.name : null,
        },
        score:
          typeof match.matchConfidence === "number" && Number.isFinite(match.matchConfidence)
            ? match.matchConfidence
            : 0,
      };
    } catch (error) {
      console.error("Failed to match scanner face", error);
      return {
        matched: false,
        message: "Koneksi ke server gagal saat mencocokkan wajah.",
      };
    }
  }, []);

  const failScanner = useCallback(
    async (
      scanStatus: "FAILED" | "SPOOF",
      message: string,
      spoofType?: FaceSpoofType
    ) => {
      updateScannerStage("FAILED");
      setScannerStatus(scanStatus === "SPOOF" ? "Percobaan spoof terblokir" : "Verifikasi gagal");
      setScannerSubStatus(message);
      stopScannerStream();
      await recordScannerFailure(scanStatus, message, spoofType);
    },
    [recordScannerFailure, stopScannerStream, updateScannerStage]
  );

  const recordScannerSuccess = useCallback(async (faceDescriptor: Float32Array) => {
    if (scannerLoggedRef.current) {
      return;
    }

    scannerLoggedRef.current = true;
    updateScannerStage("SUCCESS");
    setScannerStatus("Absensi berhasil");
    setScannerSubStatus("Menyimpan absensi wajah...");
    stopScannerStream();

    try {
      const res = await apiFetch("/attendance-face/scan-success", {
        method: "POST",
        credentials: "include",
        suppressUnauthorizedRedirect: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          faceDescriptor: Array.from(faceDescriptor),
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        updateScannerStage("FAILED");
        setScannerStatus("Absensi gagal disimpan");
        setScannerSubStatus(getApiErrorMessage(json, "Gagal menyimpan absensi."));
        return;
      }

      const eventType = json?.response?.attendance?.eventType;
      const log = json?.response?.log ?? {};
      const employee: AttendanceEmployee = {
        badgeNum: typeof log.badgeNum === "string" ? log.badgeNum : "-",
        name: typeof log.employeeName === "string" ? log.employeeName : null,
      };
      const score =
        typeof log.matchConfidence === "number" && Number.isFinite(log.matchConfidence)
          ? log.matchConfidence
          : 0;

      matchedEmployeeRef.current = employee;
      matchedScoreRef.current = score;
      setMatchedEmployee(employee);
      setMatchedScore(score);
      setScannerSubStatus(
        `${formatEmployeeName(employee)} tercatat ${
          eventType === "CHECK_OUT" ? "pulang" : "masuk"
        }. Confidence ${(score * 100).toFixed(0)}%.`
      );
      showToast("Absensi wajah berhasil disimpan.");
      await fetchAttendanceData();
    } catch (error) {
      console.error("Failed to record scanner success", error);
      updateScannerStage("FAILED");
      setScannerStatus("Absensi gagal disimpan");
      setScannerSubStatus("Koneksi ke server gagal saat menyimpan absensi.");
    }
  }, [fetchAttendanceData, showToast, stopScannerStream, updateScannerStage]);

  const processScannerFrame = useCallback(async () => {
    if (!scannerVoiceEnabledRef.current) {
      return;
    }

    const stage = scannerStageRef.current;
    if (stage !== "ALIGN" && stage !== "CHALLENGE") {
      return;
    }

    const video = scannerVideoRef.current;
    if (!video || video.videoWidth === 0 || video.readyState < 2) {
      return;
    }

    const elapsed = Date.now() - scannerStartedAtRef.current;
    if (stage === "ALIGN" && elapsed > 20000) {
      await failScanner("FAILED", "Wajah tidak dikenali dalam 20 detik.", "PROFILE_MISMATCH");
      return;
    }

    if (stage === "CHALLENGE" && elapsed > 55000) {
      await failScanner("FAILED", "Liveness tidak selesai dalam batas waktu.", "VIDEO_REPLAY");
      return;
    }

    if (stage === "ALIGN") {
      const face = await detectFace(video);
      if (!face) {
        setScannerSubStatus("Wajah belum terbaca. Posisikan wajah di dalam lingkaran kamera.");
        announceScannerGuidance("NO_FACE", "Posisikan wajah di dalam lingkaran kamera.");
        consecutiveMatchRef.current = 0;
        return;
      }

      const box = face.detection.box;
      const alignmentGuidance = getAlignmentGuidance(box, video, ALIGN_MIN_FACE_WIDTH_RATIO);

      if (alignmentGuidance) {
        setScannerSubStatus(alignmentGuidance.status);
        announceScannerGuidance(alignmentGuidance.key, alignmentGuidance.voice);
        consecutiveMatchRef.current = 0;
        return;
      }

      const now = Date.now();
      if (now - lastMatchCheckAtRef.current < MATCH_CHECK_INTERVAL_MS) {
        setScannerSubStatus("Tahan posisi. Sistem sedang mencocokkan wajah.");
        return;
      }
      lastMatchCheckAtRef.current = now;

      setScannerSubStatus("Mencocokkan wajah dengan profile karyawan...");
      const matchResult = await checkFaceProfileMatch(face.descriptor);
      if (scannerStageRef.current !== "ALIGN") {
        return;
      }

      if (!matchResult.matched) {
        consecutiveMatchRef.current = 0;
        matchedEmployeeRef.current = null;
        matchedScoreRef.current = 0;
        setMatchedEmployee(null);
        setMatchedScore(0);
        setScannerSubStatus(`${matchResult.message} Hadapkan wajah lurus dan pas kan ke tengah lingkaran.`);
        announceScannerGuidance(
          "FACE_MISMATCH",
          "Wajah belum cocok. Hadapkan wajah lurus, buka area wajah, lalu pas kan ke tengah lingkaran kamera."
        );
        return;
      }

      matchedEmployeeRef.current = matchResult.employee;
      matchedScoreRef.current = matchResult.score;
      setMatchedEmployee(matchResult.employee);
      setMatchedScore(matchResult.score);
      consecutiveMatchRef.current += 1;

      setScannerSubStatus(
        `Wajah cocok: ${formatEmployeeName(matchResult.employee)} - frame ${consecutiveMatchRef.current}/${MATCH_CONFIRMATION_FRAMES}. Tetap lihat kamera.`
      );

      if (consecutiveMatchRef.current >= MATCH_CONFIRMATION_FRAMES) {
        const sequence = getRandomChallenges();
        challengeSequenceRef.current = sequence;
        challengeIndexRef.current = 0;
        setChallengeTotal(sequence.length);
        setChallengeStep(0);
        setActiveChallenge(sequence[0]);
        resetChallengeMotion();
        setScannerStatus("Memuat liveness challenge");
        setScannerSubStatus("Menyiapkan instruksi gerakan...");

        scannerStartedAtRef.current = Date.now();
        scannerMetricsLastUpdateRef.current = 0;
        updateScannerStage("CHALLENGE");
        setScannerStatus("Liveness challenge");
        setScannerSubStatus(`Langkah 1/${sequence.length}: ${challengeLabels[sequence[0]]}.`);
        announceChallenge(sequence[0], 0, sequence.length);
      }

      return;
    }

    const geometry = await detectFaceGeometry(video);
    if (!geometry) {
      setMetrics((currentMetrics) => ({ ...currentMetrics, source: "-", face: 0 }));
      setScannerSubStatus("Wajah hilang dari kamera.");
      consecutiveMatchRef.current = 0;
      return;
    }

    const metricsFromFaceApi = getFaceApiMetrics(geometry.landmarks);
    const livenessFrame: LivenessFrame = {
      source: "FA",
      faceCount: geometry.landmarks.positions.length,
      box: geometry.detection.box,
      eyeOpenScore: metricsFromFaceApi.eyeOpenScore,
      mouthScore: metricsFromFaceApi.mouthScore,
      yaw: metricsFromFaceApi.yaw,
      pitch: metricsFromFaceApi.pitch,
    };

    const challengeAlignmentGuidance = getAlignmentGuidance(
      livenessFrame.box,
      video,
      CHALLENGE_MIN_FACE_WIDTH_RATIO
    );

    if (challengeAlignmentGuidance) {
      setScannerSubStatus(challengeAlignmentGuidance.status);
      announceScannerGuidance(
        `CHALLENGE_${challengeAlignmentGuidance.key}`,
        challengeAlignmentGuidance.voice
      );
      return;
    }

    const eyeOpenScore = livenessFrame.eyeOpenScore;
    const mouthScore = livenessFrame.mouthScore;
    const yaw = livenessFrame.yaw;
    const pitch = livenessFrame.pitch;
    const sharpness = calculateLaplacianVariance(video, livenessFrame.box);
    const now = Date.now();

    if (now - scannerMetricsLastUpdateRef.current > METRICS_UPDATE_INTERVAL_MS) {
      scannerMetricsLastUpdateRef.current = now;
      setMetrics({
        source: livenessFrame.source,
        face: livenessFrame.faceCount,
        eye: Number(eyeOpenScore.toFixed(3)),
        mouth: Number(mouthScore.toFixed(3)),
        yaw: Number(yaw.toFixed(3)),
        pitch: Number(pitch.toFixed(3)),
        sharpness,
      });
    }

    if (sharpness > 0 && sharpness < 15) {
      blurFrameCountRef.current += 1;
    } else {
      blurFrameCountRef.current = 0;
    }

    if (blurFrameCountRef.current > 6) {
      await failScanner("SPOOF", "Tekstur wajah terlalu datar. Foto atau layar kemungkinan digunakan.", "PHOTO");
      return;
    }

    const current = challengeSequenceRef.current[challengeIndexRef.current];
    if (!current) {
      return;
    }

    let stepDone = false;
    const stepLabel = `Langkah ${challengeIndexRef.current + 1}/${challengeSequenceRef.current.length}`;

    if (current === "BLINK") {
      earRecentRef.current.push(eyeOpenScore);
      if (earRecentRef.current.length > 5) {
        earRecentRef.current.shift();
      }
      const minEye = Math.min(...earRecentRef.current);
      if (blinkStageRef.current === "open" && minEye < 0.55) {
        blinkStageRef.current = "closed";
      }
      if (blinkStageRef.current === "closed" && eyeOpenScore > 0.72) {
        stepDone = true;
      }
      setScannerSubStatus(`${stepLabel}: ${challengeLabels.BLINK}. Eye ${eyeOpenScore.toFixed(2)}.`);
    }

    if (current === "MOUTH") {
      if (neutralFramesRef.current < 3) {
        if (mouthScore < 0.055 && eyeOpenScore > 0.55) {
          mouthBaselineRef.current =
            (mouthBaselineRef.current * neutralFramesRef.current + mouthScore) /
            (neutralFramesRef.current + 1);
          neutralFramesRef.current += 1;
        } else {
          neutralFramesRef.current = 0;
          mouthBaselineRef.current = 0;
        }
        setScannerSubStatus(`${stepLabel}: tutup mulut dulu untuk kalibrasi.`);
      } else {
        const mouthDelta = mouthScore - mouthBaselineRef.current;
        const mouthLooksOpen =
          mouthScore > MOUTH_OPEN_THRESHOLD &&
          mouthDelta > MOUTH_OPEN_DELTA_THRESHOLD &&
          eyeOpenScore > 0.55;
        mouthFrameCountRef.current = mouthLooksOpen ? mouthFrameCountRef.current + 1 : 0;
        stepDone = mouthFrameCountRef.current >= MOUTH_CONFIRMATION_FRAMES;
        setScannerSubStatus(
          `${stepLabel}: ${challengeLabels.MOUTH}. Mouth ${mouthScore.toFixed(2)} Delta ${mouthDelta.toFixed(2)}.`
        );
      }
    }

    if (current === "TURN_LEFT" || current === "TURN_RIGHT") {
      if (yawBaselineFramesRef.current < 4 || pitchBaselineFramesRef.current < 4) {
        yawBaselineRef.current =
          (yawBaselineRef.current * yawBaselineFramesRef.current + yaw) /
          (yawBaselineFramesRef.current + 1);
        pitchBaselineRef.current =
          (pitchBaselineRef.current * pitchBaselineFramesRef.current + pitch) /
          (pitchBaselineFramesRef.current + 1);
        yawBaselineFramesRef.current += 1;
        pitchBaselineFramesRef.current += 1;
        setScannerSubStatus(`${stepLabel}: lihat lurus dulu untuk kalibrasi.`);
      } else {
        const yawDelta = yaw - yawBaselineRef.current;
        const pitchDelta = pitch - pitchBaselineRef.current;
        const expectedYawSign =
          current === "TURN_LEFT" ? USER_TURN_LEFT_YAW_SIGN : USER_TURN_RIGHT_YAW_SIGN;
        const isExpectedDirection = yawDelta * expectedYawSign > TURN_DELTA_THRESHOLD;
        const isPitchStable = Math.abs(pitchDelta) < TURN_MAX_PITCH_DELTA;
        const isYawDominant =
          Math.abs(yawDelta) > Math.abs(pitchDelta) * TURN_YAW_DOMINANCE_RATIO;
        yawFrameCountRef.current =
          isExpectedDirection && isPitchStable && isYawDominant
            ? yawFrameCountRef.current + 1
            : 0;
        stepDone = yawFrameCountRef.current >= 2;
        setScannerSubStatus(
          `${stepLabel}: ${challengeLabels[current]}. Yaw ${yaw.toFixed(2)} Delta ${yawDelta.toFixed(2)}. Pitch Delta ${pitchDelta.toFixed(2)}.`
        );
      }
    }

    if (current === "LOOK_UP" || current === "LOOK_DOWN") {
      if (pitchBaselineFramesRef.current < 5 || yawBaselineFramesRef.current < 5) {
        pitchBaselineRef.current =
          (pitchBaselineRef.current * pitchBaselineFramesRef.current + pitch) /
          (pitchBaselineFramesRef.current + 1);
        yawBaselineRef.current =
          (yawBaselineRef.current * yawBaselineFramesRef.current + yaw) /
          (yawBaselineFramesRef.current + 1);
        pitchBaselineFramesRef.current += 1;
        yawBaselineFramesRef.current += 1;
        setScannerSubStatus(`${stepLabel}: lihat lurus dulu untuk kalibrasi.`);
      } else {
        const pitchDelta = pitch - pitchBaselineRef.current;
        const yawDelta = yaw - yawBaselineRef.current;
        const isLookingUp = pitchDelta < -LOOK_DELTA_THRESHOLD;
        const isLookingDown = pitchDelta > LOOK_DELTA_THRESHOLD;
        const isTurning = Math.abs(yawDelta) > 0.18;
        const isExpectedDirection =
          current === "LOOK_UP" ? isLookingUp : isLookingDown;

        pitchFrameCountRef.current =
          isExpectedDirection && !isTurning ? pitchFrameCountRef.current + 1 : 0;
        stepDone = pitchFrameCountRef.current >= 2;
        setScannerSubStatus(
          `${stepLabel}: ${challengeLabels[current]}. Pitch ${pitch.toFixed(2)} Delta ${pitchDelta.toFixed(2)}.`
        );
      }
    }

    if (current === "NOD") {
      if (pitchBaselineFramesRef.current < 5 || yawBaselineFramesRef.current < 5) {
        pitchBaselineRef.current =
          (pitchBaselineRef.current * pitchBaselineFramesRef.current + pitch) /
          (pitchBaselineFramesRef.current + 1);
        yawBaselineRef.current =
          (yawBaselineRef.current * yawBaselineFramesRef.current + yaw) /
          (yawBaselineFramesRef.current + 1);
        pitchBaselineFramesRef.current += 1;
        yawBaselineFramesRef.current += 1;
        setScannerSubStatus(`${stepLabel}: kalibrasi posisi kepala.`);
      } else {
        const pitchDelta = pitch - pitchBaselineRef.current;
        const yawDelta = yaw - yawBaselineRef.current;
        const isNodding = Math.abs(pitchDelta) > NOD_DELTA_THRESHOLD;
        const isTurning = Math.abs(yawDelta) > 0.18;
        pitchFrameCountRef.current = isNodding && !isTurning ? pitchFrameCountRef.current + 1 : 0;
        stepDone = pitchFrameCountRef.current >= 2;
        setScannerSubStatus(
          `${stepLabel}: ${challengeLabels.NOD}. Pitch ${pitch.toFixed(2)} Delta ${pitchDelta.toFixed(2)}.`
        );
      }
    }

    if (stepDone) {
      const nextIndex = challengeIndexRef.current + 1;
      if (nextIndex >= challengeSequenceRef.current.length) {
        setScannerSubStatus("Liveness lolos. Verifikasi wajah terakhir...");
        const finalFace = await detectFace(video);
        if (!finalFace) {
          await failScanner("FAILED", "Wajah tidak terbaca saat verifikasi akhir.", "PROFILE_MISMATCH");
          return;
        }

        setScannerSubStatus("Liveness lolos. Mencocokkan wajah dan menyimpan absensi...");
        await recordScannerSuccess(finalFace.descriptor);
        return;
      }

      challengeIndexRef.current = nextIndex;
      setChallengeStep(nextIndex);
      setActiveChallenge(challengeSequenceRef.current[nextIndex]);
      resetChallengeMotion();
      setScannerSubStatus(
        `Langkah ${nextIndex + 1}/${challengeSequenceRef.current.length}: ${
          challengeLabels[challengeSequenceRef.current[nextIndex]]
        }.`
      );
      announceChallenge(
        challengeSequenceRef.current[nextIndex],
        nextIndex,
        challengeSequenceRef.current.length
      );
    }
  }, [
    announceChallenge,
    announceScannerGuidance,
    checkFaceProfileMatch,
    failScanner,
    recordScannerSuccess,
    resetChallengeMotion,
    updateScannerStage,
  ]);

  const startScannerLoop = useCallback((runId = scannerRunIdRef.current) => {
    const loop = async () => {
      if (!isScannerRunActive(runId)) {
        scannerFrameRef.current = null;
        return;
      }

      const now = Date.now();
      const interval =
        scannerStageRef.current === "CHALLENGE"
          ? CHALLENGE_PROCESS_INTERVAL_MS
          : ALIGN_PROCESS_INTERVAL_MS;

      if (now - scannerLastCheckRef.current > interval && !scannerProcessingRef.current) {
        scannerLastCheckRef.current = now;
        scannerProcessingRef.current = true;
        try {
          await processScannerFrame();
        } catch (error) {
          console.error("Scanner frame failed", error);
        } finally {
          scannerProcessingRef.current = false;
        }
      }

      if (!isScannerRunActive(runId)) {
        scannerFrameRef.current = null;
        return;
      }

      scannerFrameRef.current = requestAnimationFrame(loop);
    };

    loop();
  }, [isScannerRunActive, processScannerFrame]);

  const startScanner = async () => {
    if (employees.length === 0) {
      showToast("Belum ada profile wajah karyawan yang terdaftar.", "error");
      return;
    }

    try {
      setActiveMode("scan");
      stopScannerStream();
      stopEnrollmentStream();
      const runId = scannerRunIdRef.current + 1;
      scannerRunIdRef.current = runId;
      scannerVoiceEnabledRef.current = true;
      scannerLoggedRef.current = false;
      updateScannerStage("LOADING");
      setScannerStatus("Memuat scanner wajah");
      setScannerSubStatus("Memuat face model dan kamera...");
      speakScannerInstruction("Scanner wajah dimulai. Posisikan wajah di tengah kamera.", runId);

      await loadFaceApiModels();
      if (!isScannerRunActive(runId)) {
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: CAMERA_CONSTRAINTS,
      });
      if (!isScannerRunActive(runId)) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      scannerStreamRef.current = stream;
      if (scannerVideoRef.current) {
        scannerVideoRef.current.srcObject = stream;
        scannerVideoRef.current.muted = true;
        scannerVideoRef.current.playsInline = true;
        await scannerVideoRef.current.play().catch(() => undefined);
      }

      scannerStartedAtRef.current = Date.now();
      scannerLastCheckRef.current = 0;
      scannerMetricsLastUpdateRef.current = 0;
      consecutiveMatchRef.current = 0;
      blurFrameCountRef.current = 0;
      lastGuidanceKeyRef.current = "";
      lastGuidanceSpokenAtRef.current = 0;
      lastMatchCheckAtRef.current = 0;
      matchedEmployeeRef.current = null;
      matchedScoreRef.current = 0;
      setMatchedEmployee(null);
      setMatchedScore(0);
      updateScannerStage("ALIGN");
      setScannerStatus("Cari wajah karyawan");
      setScannerSubStatus("Posisikan wajah di tengah frame.");
      startScannerLoop(runId);
    } catch (error) {
      console.error("Scanner failed to start", error);
      scannerVoiceEnabledRef.current = false;
      updateScannerStage("FAILED");
      setScannerStatus("Kamera gagal dibuka");
      setScannerSubStatus("Periksa izin kamera browser dan coba lagi.");
      stopScannerStream();
    }
  };

  const selectedEnrollmentEmployee = employees.find(
    (employee) => employee.badgeNum.trim() === enrollmentBadgeNum.trim()
  );

  return (
    <div className="min-h-screen bg-[#f8faff] text-slate-900">
      <main className="min-h-screen px-4 py-6 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-500">
                Absensi wajah
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-950">
                Absensi Karyawan
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Halaman public untuk scan masuk dan pulang. Data karyawan yang tampil hanya
                nama dan badge number.
              </p>
            </div>
            <div className="inline-flex w-full rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:w-auto">
              <button
                type="button"
                onClick={() => switchMode("scan")}
                className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition sm:flex-none ${
                  activeMode === "scan"
                    ? "bg-[#272e79] text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <i className="fa-solid fa-camera" aria-hidden="true"></i>
                Scan Absensi
              </button>
              <button
                type="button"
                onClick={() => switchMode("enroll")}
                className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition sm:flex-none ${
                  activeMode === "enroll"
                    ? "bg-[#272e79] text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <i className="fa-solid fa-user-plus" aria-hidden="true"></i>
                Daftar Wajah
              </button>
            </div>
          </header>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm">
              <i className="fa-solid fa-spinner mr-2 animate-spin" aria-hidden="true"></i>
              Memuat data absensi wajah...
            </div>
          ) : null}

          {!loading ? (
            <section className="flex flex-col gap-6">
              {activeMode === "scan" ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">
                      Scanner kamera
                    </h2>
                    <p className="text-sm text-slate-500">
                      Sistem mencocokkan wajah lalu meminta dua aksi liveness acak.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {scannerStage === "IDLE" || scannerStage === "FAILED" || scannerStage === "SUCCESS" ? (
                      <button
                        type="button"
                        onClick={startScanner}
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#272e79] px-4 text-sm font-semibold text-white transition hover:bg-[#1f2565]"
                      >
                        <i className="fa-solid fa-play" aria-hidden="true"></i>
                        Mulai
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={resetScanner}
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                      >
                        <i className="fa-solid fa-stop" aria-hidden="true"></i>
                        Stop
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-900 bg-black">
                  <div className="relative aspect-[4/3] w-full">
                    <video
                      ref={scannerVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className={`h-full w-full object-cover [transform:scaleX(-1)] ${
                        scannerStage === "SUCCESS" ? "opacity-50 grayscale" : ""
                      }`}
                    />
                    {(scannerStage === "ALIGN" || scannerStage === "CHALLENGE") ? (
                      <>
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="h-[76%] w-[42%] rounded-[50%] border-4 border-dashed border-cyan-300/80 bg-cyan-300/5 shadow-[0_0_0_9999px_rgba(0,0,0,0.28)]"></div>
                        </div>
                        <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-1 bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_18px_rgba(103,232,249,0.9)]"></div>
                      </>
                    ) : null}
                    {scannerStage === "IDLE" || scannerStage === "LOADING" ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/92 p-6 text-center text-white">
                        <i
                          className={`fa-solid ${
                            scannerStage === "LOADING" ? "fa-spinner animate-spin" : "fa-camera"
                          } text-4xl text-cyan-300`}
                          aria-hidden="true"
                        ></i>
                        <p className="mt-4 text-sm font-semibold">{scannerStatus}</p>
                        <p className="mt-1 max-w-sm text-xs leading-5 text-slate-300">{scannerSubStatus}</p>
                      </div>
                    ) : null}
                    {scannerStage === "SUCCESS" || scannerStage === "FAILED" ? (
                      <div
                        className={`absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white ${
                          scannerStage === "SUCCESS" ? "bg-emerald-950/88" : "bg-rose-950/90"
                        }`}
                      >
                        <i
                          className={`fa-solid ${
                            scannerStage === "SUCCESS" ? "fa-circle-check text-emerald-300" : "fa-triangle-exclamation text-rose-300"
                          } text-5xl`}
                          aria-hidden="true"
                        ></i>
                        <p className="mt-4 text-lg font-semibold">{scannerStatus}</p>
                        <p className="mt-2 max-w-md text-sm leading-6 text-slate-100">{scannerSubStatus}</p>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{scannerStatus}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{scannerSubStatus}</p>
                    </div>
                    {matchedEmployee ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        <span className="font-semibold">{formatEmployeeName(matchedEmployee)}</span>
                        <span className="ml-2">{(matchedScore * 100).toFixed(0)}%</span>
                      </div>
                    ) : null}
                  </div>
                  {scannerStage === "CHALLENGE" ? (
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        <span>{activeChallenge ? challengeLabels[activeChallenge] : "Challenge"}</span>
                        <span>{challengeStep + 1}/{challengeTotal}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: challengeTotal }).map((_, index) => (
                          <div
                            key={index}
                            className={`h-2 rounded-full ${
                              index < challengeStep
                                ? "bg-emerald-400"
                                : index === challengeStep
                                ? "bg-[#272e79]"
                                : "bg-slate-200"
                            }`}
                          ></div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
              ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-lg font-semibold text-slate-950">Daftar wajah</h2>
                    <p className="text-sm leading-6 text-slate-500">
                      Pilih badge number lalu buka kamera. Profile otomatis diambil saat wajah sudah jelas.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!enrollmentCameraOpen ? (
                      <button
                        type="button"
                        onClick={startEnrollmentCamera}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#272e79] px-4 text-sm font-semibold text-white transition hover:bg-[#1f2565]"
                      >
                        <i className="fa-solid fa-camera" aria-hidden="true"></i>
                        Buka kamera
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopEnrollmentStream}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                      >
                        <i className="fa-solid fa-stop" aria-hidden="true"></i>
                        Stop
                      </button>
                    )}
                  </div>
                </div>

                <label className="mt-5 block text-sm font-semibold text-slate-700" htmlFor="attendance-enroll-badge">
                  Badge number
                </label>
                <input
                  id="attendance-enroll-badge"
                  list="attendance-employee-options"
                  value={enrollmentBadgeNum}
                  onChange={(event) => {
                    setEnrollmentBadgeNum(event.target.value);
                    setEnrollmentCapturedImage(null);
                  }}
                  placeholder="Contoh: 100012"
                  className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-[#272e79] focus:ring-2 focus:ring-[#272e79]/15"
                />
                <datalist id="attendance-employee-options">
                  {employees.map((employee) => (
                    <option
                      key={employee.badgeNum}
                      value={employee.badgeNum}
                      label={employee.name?.trim() || employee.badgeNum}
                    />
                  ))}
                </datalist>
                <p className="mt-2 text-xs text-slate-500">
                  {selectedEnrollmentEmployee
                    ? formatEmployeeName(selectedEnrollmentEmployee)
                    : "Ketik badge number karyawan yang akan didaftarkan."}
                </p>

                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-900 bg-black">
                  <div className="relative aspect-[4/3] w-full">
                    <video
                      ref={enrollmentVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="h-full w-full object-cover [transform:scaleX(-1)]"
                    />
                    {!enrollmentCameraOpen ? (
                      <div
                        className={`absolute inset-0 bg-slate-950/92 text-white ${
                          enrollmentCapturedImage
                            ? ""
                            : "flex flex-col items-center justify-center p-6 text-center"
                        }`}
                      >
                        {enrollmentCapturedImage ? (
                          <>
                            <img
                              src={enrollmentCapturedImage}
                              alt="Hasil cekrek daftar wajah"
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/82 to-transparent p-5 text-center">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                                Hasil cekrek
                              </p>
                              <p className="mt-1 text-sm font-semibold">{enrollmentStatus}</p>
                              <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-200">
                                {enrollmentSubStatus}
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-user-plus text-4xl text-cyan-300" aria-hidden="true"></i>
                            <p className="mt-4 text-sm font-semibold">{enrollmentStatus}</p>
                            <p className="mt-1 max-w-sm text-xs leading-5 text-slate-300">{enrollmentSubStatus}</p>
                          </>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="h-[76%] w-[42%] rounded-[50%] border-4 border-dashed border-emerald-300/80 bg-emerald-300/5 shadow-[0_0_0_9999px_rgba(0,0,0,0.28)]"></div>
                        </div>
                        {enrollmentSaving ? (
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-white/80 bg-emerald-500/85 text-5xl font-bold text-white shadow-2xl">
                              {enrollmentCountdown ?? <i className="fa-solid fa-spinner animate-spin text-3xl" aria-hidden="true"></i>}
                            </div>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-950">{enrollmentStatus}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{enrollmentSubStatus}</p>
                </div>
              </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">Log absensi wajah</h2>
                    <p className="text-sm leading-6 text-slate-500">
                      {attendanceLogs.length} aktivitas terbaru dari scanner absensi.
                    </p>
                  </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                  {attendanceLogs.length === 0 ? (
                    <div className="bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500">
                      Belum ada log absensi wajah.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          <tr>
                            <th className="whitespace-nowrap px-4 py-3">Waktu</th>
                            <th className="whitespace-nowrap px-4 py-3">Karyawan</th>
                            <th className="whitespace-nowrap px-4 py-3">Tipe</th>
                            <th className="whitespace-nowrap px-4 py-3">Status</th>
                            <th className="whitespace-nowrap px-4 py-3">Confidence</th>
                            <th className="min-w-[220px] px-4 py-3">Keterangan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {attendanceLogs.map((log) => (
                            <tr key={log.faceScanLogId} className="align-top">
                              <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                                {formatLogTime(log.scanTime)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                                {formatLogEmployeeName(log)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                                {eventTypeLabels[log.eventType] ?? log.eventType}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3">
                                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusTone(log.scanStatus)}`}>
                                  {scanStatusLabels[log.scanStatus] ?? log.scanStatus}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                                {typeof log.matchConfidence === "number"
                                  ? `${(log.matchConfidence * 100).toFixed(0)}%`
                                  : "-"}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {log.scanStatus === "SUCCESS"
                                  ? "Liveness lolos dan absensi tersimpan."
                                  : log.failureReason || log.spoofType || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </section>
          ) : null}

        </div>
      </main>
    </div>
  );
};

export default AbsensiPage;
