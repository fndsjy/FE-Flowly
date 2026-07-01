import * as faceapi from "@vladmandic/face-api";

const MODEL_URL = `${import.meta.env.BASE_URL}models/face-api/`;
const FACE_DETECTOR_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 224,
  scoreThreshold: 0.3,
});

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

export interface FaceDetectionResult {
  detection: faceapi.FaceDetection;
  landmarks: faceapi.FaceLandmarks68;
  descriptor: Float32Array;
}

export interface FaceGeometryResult {
  detection: faceapi.FaceDetection;
  landmarks: faceapi.FaceLandmarks68;
}

export const loadFaceApiModels = async () => {
  if (modelsLoaded) {
    return;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      modelsLoaded = true;
    } catch (error) {
      loadingPromise = null;
      throw error;
    }
  })();

  return loadingPromise;
};

export const detectFace = async (
  input: HTMLVideoElement | HTMLImageElement
): Promise<FaceDetectionResult | null> => {
  await loadFaceApiModels();

  try {
    const result = await faceapi
      .detectSingleFace(input, FACE_DETECTOR_OPTIONS)
      .withFaceLandmarks(true)
      .withFaceDescriptor();

    if (!result) {
      return null;
    }

    return {
      detection: result.detection,
      landmarks: result.landmarks,
      descriptor: result.descriptor,
    };
  } catch (error) {
    console.error("Face detection failed", error);
    return null;
  }
};

export const detectFaceGeometry = async (
  input: HTMLVideoElement | HTMLImageElement
): Promise<FaceGeometryResult | null> => {
  await loadFaceApiModels();

  try {
    const result = await faceapi
      .detectSingleFace(input, FACE_DETECTOR_OPTIONS)
      .withFaceLandmarks(true);

    if (!result) {
      return null;
    }

    return {
      detection: result.detection,
      landmarks: result.landmarks,
    };
  } catch (error) {
    console.error("Face geometry detection failed", error);
    return null;
  }
};
