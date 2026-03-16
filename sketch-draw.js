function sketchDraw(p) {

  let bodyPose, video, poses, handPose;
  let hands = [];
  let path = [];
  let spacing = 10;
  let paragraph = "A fairy godmother transformed pumpkins and mice into a shining carriage.";
  let smoothX, smoothY;
  const SMOOTHEN = 0.07;

  // BlazePose connections — pairs of keypoint indices to draw skeleton lines
  const connections = [
    [0,1],[1,2],[2,3],[3,7],   // face
    [0,4],[4,5],[5,6],[6,8],
    [9,10],                     // mouth
    [11,12],                    // shoulders
    [11,13],[13,15],            // left arm
    [12,14],[14,16],            // right arm
    [15,17],[15,19],[17,19],    // left hand
    [16,18],[16,20],[18,20],    // right hand
    [11,23],[12,24],[23,24],    // torso
    [23,25],[25,27],[27,29],[29,31],[27,31], // left leg
    [24,26],[26,28],[28,30],[30,32],[28,32]  // right leg
  ];

  p.setup = function () {
    p.createCanvas(p.windowWidth, p.windowHeight);
    video = p.createCapture(p.VIDEO);
    video.size(p.windowWidth, p.windowHeight);
    video.hide();

    bodyPose = ml5.bodyPose("BlazePose", { flipped: true }, () => {
      console.log("BlazePose ready");
      bodyPose.detectStart(video, r => poses = r);
    });

    handPose = ml5.handPose({ flipped: true }, () => {
      handPose.detectStart(video, r => hands = r);
    });
  };

  p.draw = function () {
    p.background(255, 102, 0);

    // Draw skeleton
    if (poses && poses.length > 0) {
      let pose = poses[0];

      // Draw connection lines
      p.stroke(0, 20);
      p.strokeWeight(50);
      for (let [a, b] of connections) {
        let kpA = pose.keypoints[a];
        let kpB = pose.keypoints[b];
        if (kpA && kpB && kpA.confidence > 0.2 && kpB.confidence > 0.2) {
          p.line(kpA.x, kpA.y, kpB.x, kpB.y);
        }
      }

      // Draw joints
      for (let kp of pose.keypoints) {
        if (kp.confidence > 0.2) {
          p.noStroke();
          p.fill(0, 80);
          p.circle(kp.x, kp.y, 5);
        }
      }
    }

    // Hand tracking + path drawing
    if (hands.length > 0) {
      let index = hands[0].keypoints[8];
      if (smoothX === undefined) {
        smoothX = index.x; smoothY = index.y;
      } else {
        smoothX = p.lerp(smoothX, index.x, SMOOTHEN);
        smoothY = p.lerp(smoothY, index.y, SMOOTHEN);
      }
      p.fill(255, 0, 255);
      p.noStroke();
      p.circle(smoothX, smoothY, 16);
      addPathPoint(smoothX, smoothY);
      drawParagraphOnPath();
    }
  };

  function addPathPoint(x, y) {
    if (path.length === 0 ||
        p.dist(x, y, path[path.length-1].x, path[path.length-1].y) > spacing) {
      path.push({ x, y });
      if (path.length > 500) path.shift();
    }
  }

  function drawParagraphOnPath() {
    if (path.length < 2) return;
    let cumDist = [0];
    for (let i = 1; i < path.length; i++) {
      cumDist.push(cumDist[i-1] + p.dist(path[i].x, path[i].y, path[i-1].x, path[i-1].y));
    }
    let totalLen = cumDist[cumDist.length-1];
    let fs = globalFontSize || 20;
    p.textFont('Palatino Linotype');
    p.textSize(fs);
    p.textAlign(p.CENTER, p.CENTER);
    let charSpacing = fs * 0.65;
    let numChars = p.floor(totalLen / charSpacing);
    for (let i = 0; i < numChars; i++) {
      let targetDist = i * charSpacing;
      if (targetDist > totalLen) break;
      let seg = findSegment(cumDist, targetDist);
      if (seg >= path.length - 1) break;
      let segLen = cumDist[seg+1] - cumDist[seg];
      let t = segLen === 0 ? 0 : (targetDist - cumDist[seg]) / segLen;
      let x = p.lerp(path[seg].x, path[seg+1].x, t);
      let y = p.lerp(path[seg].y, path[seg+1].y, t);
      let angle = p.atan2(path[seg+1].y - path[seg].y, path[seg+1].x - path[seg].x);
      let fade = p.map(i, 0, numChars, 60, 255);
      p.push();
      p.translate(x, y);
      p.rotate(angle);
      p.fill(0, fade);
      p.noStroke();
      p.text(paragraph[i % paragraph.length], 0, 0);
      p.pop();
    }
  }

  function findSegment(cumDist, target) {
    let lo = 0, hi = cumDist.length - 2;
    while (lo < hi) {
      let mid = p.floor((lo + hi + 1) / 2);
      if (cumDist[mid] <= target) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  p.windowResized = function () {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    if (video) video.size(p.windowWidth, p.windowHeight);
  };

  p.remove = function () {
    if (video) video.remove();
  };
}
