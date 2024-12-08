import { Pose } from "https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675473637/pose.js";

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

async function setupVideo() {
  try {
    // Set the video source and controls
    video.src = "./lifting_video.mp4";
    video.controls = true;

    await new Promise((resolve, reject) => {
      video.onloadedmetadata = () => {
        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        resolve();
      };
      video.onerror = reject;
    });
  } catch (error) {
    console.error("Video setup failed:", error);
  }
}

async function run() {
  try {
    // Wait for the video to be set up
    await setupVideo();

    // Initialize Pose
    const pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675473637/${file}`,
    });

    // Load the pose estimation model
    await pose.load();

    // Setup results handler
    pose.onResults((results) => {
      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw the video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Check if landmarks are detected
      if (results.poseLandmarks) {
        console.log("Landmarks detected:", results.poseLandmarks.length);

        // Draw landmarks
        results.poseLandmarks.forEach((landmark, index) => {
          const x = landmark.x * canvas.width;
          const y = landmark.y * canvas.height;

          ctx.beginPath();
          ctx.arc(x, y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = "red";
          ctx.fill();

          // Optional: Add landmark index
          ctx.fillStyle = "white";
          ctx.font = "10px Arial";
          ctx.fillText(index, x, y);
        });
      }
    });

    // Process the video frame by frame
    video.addEventListener("play", async () => {
      const processVideo = async () => {
        if (!video.paused && !video.ended) {
          await pose.send({ image: video });
          requestAnimationFrame(processVideo);
        }
      };
      processVideo();
    });
  } catch (error) {
    console.error("Pose estimation setup failed:", error);
  }
}

// Run when DOM is loaded
document.addEventListener("DOMContentLoaded", run);
