const video = document.getElementById('video');
const videoJquery = $('#video');
const videoContainer = $("#video-container");
const calibrateContainer = $("#calibrate");
const calibrating = $("#calibrating");
const calibrateDoneContainer = $("#done-calibrating");
const posture = new Audio();
posture.src = "Posture.m4a";

const numCalibrations = 30;
const numWrongFramesNeeded = 90;
const tolerance = .2;
const warningTimeout = 15 * 1000;

let targetHeight = 0;
let targetY = 0;
let shouldCalibrate = false;
let calibrated = false;
let calibrations = 0;
let lastWarning = 0;

let numWrongFrames = 0;

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
  faceapi.nets.faceExpressionNet.loadFromUri('/models')
]).then(startVideo)

function startVideo() {
  navigator.getUserMedia(
    { video: {} },
    stream => video.srcObject = stream,
    err => console.error(err)
  )
}

video.addEventListener('play', () => {

  const canvas = faceapi.createCanvasFromMedia(video)
  videoContainer.append(canvas)
  const displaySize = { width: video.width, height: video.height }
  faceapi.matchDimensions(canvas, displaySize)
  setInterval(async () => {
    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions()
    const resizedDetections = faceapi.resizeResults(detections, displaySize)
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    faceapi.draw.drawDetections(canvas, resizedDetections)
    
    if (shouldCalibrate) {
      if (calibrations < numCalibrations) {
        if (detections.length == 1) {
          targetY += detections[0].detection.box.y;
          targetHeight += detections[0].detection.box.height;
          calibrations++;
          console.log("Calibrating");
        }
        
        calibrateContainer.hide();
        calibrating.show();
        calibrateDoneContainer.hide();
        videoJquery.css("box-shadow", "0 0 0px 0px #fff");
      } else {
        targetY /= numCalibrations;
        targetHeight /= numCalibrations;
        calibrated = true;
        shouldCalibrate = false;
        console.log("Calibrated");
        calibrateContainer.hide();
        calibrating.hide();
        calibrateDoneContainer.show();
      }
    }

    if (calibrated && detections.length == 1) {
      let yDiff = Math.abs(targetY - detections[0].detection.box.y);
      let heightDiff = Math.abs(targetHeight - detections[0].detection.box.height);
      let updateFrames = Date.now() - lastWarning > warningTimeout;

      if (yDiff / targetY >= tolerance || heightDiff / targetHeight >= tolerance) {
        if (updateFrames) {
          numWrongFrames++;
        }
        console.log("Bad frame: " + numWrongFrames);
        videoJquery.css("box-shadow", "0 0 5px 5px #f00");
      } else {
        if (updateFrames) {
          numWrongFrames--;
          numWrongFrames = numWrongFrames < 0 ? 0 : numWrongFrames;
        }
        videoJquery.css("box-shadow", "0 0 5px 5px #0f0");
      }

      if (numWrongFrames >= numWrongFramesNeeded) {
        numWrongFrames = 0;
        console.log("Check your posture");
        let audio = {};
        posture.play();
        lastWarning = Date.now();
      }
    }
  }, 100);
})

function calibrate(e) {
  shouldCalibrate = true;
  calibrated = false;
  calibrations = 0;
  targetY = 0;
  targetHeight = 0;

  console.log("Calibrating");
}