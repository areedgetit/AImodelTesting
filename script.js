async function setupVideo() {
  // Select the video element
  const video = document.getElementById('video');
  
  // Load the video from the local directory (make sure the video file is in the same folder as the HTML)
  video.src = 'lifting_video.mp4';  // Ensure the file name matches the video file you added
  
  // Wait for the video to load completely before proceeding
  await new Promise((resolve) => {
    video.onloadeddata = () => {
      resolve();
    };
  });
}

async function estimatePose(video) {
  // Load the PoseNet model
  const net = await posenet.load();
  
  // Estimate the pose from the video frame
  const pose = await net.estimateSinglePose(video, {
    flipHorizontal: false
  });
  
  console.log(pose);
  drawPose(pose);
}

function drawPose(pose) {
  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  canvas.width = 640;
  canvas.height = 480;

  // Draw keypoints
  pose.keypoints.forEach((point) => {
    if (point.score > 0.5) {
      ctx.beginPath();
      ctx.arc(point.position.x, point.position.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = 'red';
      ctx.fill();
    }
  });
}

async function run() {
  const video = document.getElementById('video');
  await setupVideo();

  // Once the video is loaded, start analyzing it
  video.onplaying = async () => {
    while (!video.paused && !video.ended) {
      await estimatePose(video);
      await new Promise(resolve => setTimeout(resolve, 100));  // Process every 100 ms (10 FPS)
    }
  };
}

run();
