export const calculateLaplacianVariance = (
  video: HTMLVideoElement,
  box: { x: number; y: number; width: number; height: number }
) => {
  try {
    const canvas = document.createElement("canvas");
    const size = 64;
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return 0;
    }

    const sx = Math.max(0, box.x);
    const sy = Math.max(0, box.y);
    const sWidth = Math.min(video.videoWidth - sx, box.width);
    const sHeight = Math.min(video.videoHeight - sy, box.height);

    if (sWidth <= 0 || sHeight <= 0) {
      return 0;
    }

    ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, size, size);

    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;
    const gray = new Float32Array(size * size);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      gray[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b;
    }

    const laplacian = new Float32Array((size - 2) * (size - 2));
    let index = 0;
    let sum = 0;

    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        const idx = y * size + x;
        const value =
          gray[idx - size] +
          gray[idx + size] +
          gray[idx - 1] +
          gray[idx + 1] -
          4 * gray[idx];

        laplacian[index++] = value;
        sum += value;
      }
    }

    const mean = sum / laplacian.length;
    let varianceSum = 0;
    for (let i = 0; i < laplacian.length; i += 1) {
      varianceSum += Math.pow(laplacian[i] - mean, 2);
    }

    return Number((varianceSum / laplacian.length).toFixed(2));
  } catch (error) {
    console.error("Sharpness calculation failed", error);
    return 0;
  }
};
