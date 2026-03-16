function sketchNose(p) {
  let bodyPose, video, poses, faceMesh;
  let faces = [];
  let options = { maxFaces: 1, refineLandmarks: false, flipped: true };
  let words = [];
  let boxX, boxY, boxW, boxH;
  let smoothNoseX, smoothNoseY;
  const NOSE_SMOOTH = 0.12;
  const REPEL_RADIUS = 70;
  const REPEL_FORCE = 100;
  const RETURN_SPEED = 0.04;
 
  const connections = [
    [0,1],[1,2],[2,3],[3,7],
    [0,4],[4,5],[5,6],[6,8],
    [9,10],
    [11,12],
    [11,13],[13,15],
    [12,14],[14,16],
    [15,17],[15,19],[17,19],
    [16,18],[16,20],[18,20],
    [11,23],[12,24],[23,24],
    [23,25],[25,27],[27,29],[29,31],[27,31],
    [24,26],[26,28],[28,30],[30,32],[28,32]
  ];
 
  p.setup = function() {
    p.createCanvas(p.windowWidth, p.windowHeight);
    video = p.createCapture(p.VIDEO, { flipped: true });
    video.size(p.windowWidth, p.windowHeight);
    video.hide();
    bodyPose = ml5.bodyPose("BlazePose", { flipped: true }, () => {
      console.log("BlazePose ready");
      bodyPose.detectStart(video, r => poses = r);
    });
    faceMesh = ml5.faceMesh({ flipped: true }, () => {
      faceMesh.detectStart(video, r => faces = r);
    });
    setupBox();
    initWords();
  };
 
  function setupBox() {
    boxX = p.width * 0.13;
    boxY = p.height * 0.12;
    boxW = p.width * 0.74;
    boxH = p.height * 0.75;
  }
 
  function initWords() {
    words = [];
    let paragraph = "The prince searched far and wide for the one whose step matched the lost shoe. When he found her, she did not bow her head this time. She stood upright, calm and certain. In some stories she had waited patiently. In others she had trusted the justice of nature. In another she had acted with kindness and spiritual balance. And in yet another she had simply dared to dream. Yet in every telling, the small gesture of a step forward changed her fate.";
    let fs = globalFontSize || 20;
    p.textFont('Palatino');
    p.textSize(fs);
 
    let wordList = paragraph.split(" ");
    let lineH = fs * 1.5;
    let padding = 20;
    let maxLineW = boxW - padding * 2;
    let lines = [], currentLine = [], currentLineW = 0;
 
    for (let i = 0; i < wordList.length; i++) {
      let ww = p.textWidth(wordList[i] + " ");
      if (currentLineW + ww > maxLineW && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = [{ word: wordList[i], w: ww }];
        currentLineW = ww;
      } else {
        currentLine.push({ word: wordList[i], w: ww });
        currentLineW += ww;
      }
    }
    if (currentLine.length > 0) lines.push(currentLine);
 
    let totalH = lines.length * lineH;
    let startY = boxY + (boxH - totalH) / 2;
 
    for (let li = 0; li < lines.length; li++) {
      let line = lines[li];
      let lineW = line.reduce((sum, w) => sum + w.w, 0);
      let startX = boxX + padding + (maxLineW - lineW) / 2;
      let xCursor = startX;
      for (let wi = 0; wi < line.length; wi++) {
        let hx = xCursor;
        let hy = startY + li * lineH;
        words.push({ word: line[wi].word, x: hx, y: hy, homeX: hx, homeY: hy, vx: 0, vy: 0 });
        xCursor += line[wi].w;
      }
    }
  }
 
  p.draw = function () {
    p.background(0, 200, 0);
 
    // Draw skeleton
    if (poses && poses.length > 0) {
      let pose = poses[0];
      p.stroke(0, 20);
      p.strokeWeight(50);
      for (let [a, b] of connections) {
        let kpA = pose.keypoints[a];
        let kpB = pose.keypoints[b];
        if (kpA && kpB && kpA.confidence > 0.2 && kpB.confidence > 0.2) {
          p.line(kpA.x, kpA.y, kpB.x, kpB.y);
        }
      }
      for (let kp of pose.keypoints) {
        if (kp.confidence > 0.2) {
          p.noStroke();
          p.fill(0, 80);
          p.circle(kp.x, kp.y, 5);
        }
      }
    }
 
    if (faces.length > 0) {
      let nose = faces[0].keypoints[1];
      if (nose) {
        if (smoothNoseX === undefined) {
          smoothNoseX = nose.x; smoothNoseY = nose.y;
        } else {
          smoothNoseX = p.lerp(smoothNoseX, nose.x, NOSE_SMOOTH);
          smoothNoseY = p.lerp(smoothNoseY, nose.y, NOSE_SMOOTH);
        }
      }
    }
 
    let fs = globalFontSize || 19;
 
    for (let w of words) {
      w.vx += (w.homeX - w.x) * RETURN_SPEED;
      w.vy += (w.homeY - w.y) * RETURN_SPEED;
      if (smoothNoseX !== undefined) {
        let dx = w.x - smoothNoseX;
        let dy = w.y - smoothNoseY;
        let d = p.sqrt(dx * dx + dy * dy);
        if (d < REPEL_RADIUS && d > 0) {
          let force = (1 - d / REPEL_RADIUS) * REPEL_FORCE;
          w.vx += (dx / d) * force;
          w.vy += (dy / d) * force;
        }
      }
      w.vx *= 0.78; w.vy *= 0.78;
      w.x += w.vx; w.y += w.vy;
      p.fill(0); p.noStroke();
      p.textFont('Palatino');
      p.textSize(fs);
      p.textAlign(p.LEFT, p.TOP);
      p.text(w.word, w.x, w.y);
    }
 
    // Nose indicator — FIXED: was noFill + noStroke (invisible)
    if (smoothNoseX !== undefined) {
      p.noFill();
      p.stroke(0, 80);
      p.strokeWeight(1);
      p.circle(smoothNoseX, smoothNoseY, REPEL_RADIUS * 2);
      p.fill(255, 0, 200);
      p.noStroke();
      p.circle(smoothNoseX, smoothNoseY, 8);
    }
  };
 
  p.windowResized = function() {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    if (video) video.size(p.windowWidth, p.windowHeight);
    setupBox();
    initWords();
  };
 
  p.remove = function() {
    if (video) {
      video.stop();
      video.remove();
    }
  };
}
