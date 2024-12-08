import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils
} from "https://cdn.skypack.dev/@mediapipe/tasks-vision@0.10.0";

document.addEventListener("DOMContentLoaded", async () => {
  const videoContainer = document.querySelector('.video-container');
  const video = document.getElementById("webcam");
  const canvasElement = document.getElementById("output_canvas");
  const canvasCtx = canvasElement.getContext("2d");
  const drawingUtils = new DrawingUtils(canvasCtx);

  let poseLandmarker = null;
  let runningMode = "VIDEO";
  let lastVideoTime = -1;
  let msPrev = window.performance.now();
  const fps = 60;
  const msPerFrame = 1000 / fps;

  // EMA smoothing
  const alpha = 0.8; // Smoothing factor (0 < alpha < 1)
  let emaLandmarks = null;

  function resizeCanvas() {
    const containerRect = videoContainer.getBoundingClientRect();
    const scale = Math.min(containerRect.width / video.videoWidth, containerRect.height / video.videoHeight);
    const width = video.videoWidth * scale;
    const height = video.videoHeight * scale;
    const left = (containerRect.width - width) / 2;
    const top = (containerRect.height - height) / 2;

    canvasElement.style.width = `${width}px`;
    canvasElement.style.height = `${height}px`;
    canvasElement.style.left = `${left}px`;
    canvasElement.style.top = `${top}px`;
    canvasElement.width = video.videoWidth;
    canvasElement.height = video.videoHeight;
  }

  // Initialize PoseLandmarker with model complexity
  const createPoseLandmarker = async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task`,
        delegate: "GPU"
      },
      runningMode: runningMode,
      numPoses: 2,
      modelComplexity: "heavy" // Options: "lite", "full", or "heavy"
    });
    console.log("PoseLandmarker created successfully with model complexity: full");
  };

  function applyEMA(newLandmarks, emaLandmarks, alpha) {
    if (!emaLandmarks) return newLandmarks;
    return newLandmarks.map((landmark, i) => ({
      x: alpha * landmark.x + (1 - alpha) * emaLandmarks[i].x,
      y: alpha * landmark.y + (1 - alpha) * emaLandmarks[i].y,
      z: alpha * landmark.z + (1 - alpha) * emaLandmarks[i].z,
      visibility: landmark.visibility
    }));
  }

  const estimatePoses = (now) => {
    if (!poseLandmarker) {
      console.warn("PoseLandmarker not initialized yet");
      requestAnimationFrame(estimatePoses);
      return;
    }

    const msPassed = now - msPrev;
    if (msPassed < msPerFrame) {
      requestAnimationFrame(estimatePoses);
      return;
    }

    const excessTime = msPassed % msPerFrame;
    msPrev = now - excessTime;

    if (lastVideoTime !== video.currentTime) {
      lastVideoTime = video.currentTime;
      const results = poseLandmarker.detectForVideo(video, performance.now());
      
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      
      if (results.landmarks) {
        for (const landmarks of results.landmarks) {
          // Apply EMA smoothing
          const smoothedLandmarks = applyEMA(landmarks, emaLandmarks, alpha);
          emaLandmarks = smoothedLandmarks;

          drawingUtils.drawConnectors(smoothedLandmarks, PoseLandmarker.POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 1 });
          drawingUtils.drawLandmarks(smoothedLandmarks, { color: '#FF0000', lineWidth: 1 });
        }
      }
    }

    requestAnimationFrame(estimatePoses);
  };

  // Set up video source
  video.src = "lifting_video.mp4";
  video.addEventListener('loadedmetadata', () => {
    console.log("Video metadata loaded");
    resizeCanvas();
    createPoseLandmarker().then(() => {
      requestAnimationFrame(estimatePoses);
    });
  });

  // Start playing the video
  try {
    await video.play();
  } catch (error) {
    console.error("Error playing the video:", error);
  }

  // Handle window resizing
  const resizeObserver = new ResizeObserver(resizeCanvas);
  resizeObserver.observe(videoContainer);
});
