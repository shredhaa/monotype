// ─── Sketch 1: Draw with finger ────────────────────────────────────
function sketchDraw(p) {
  let bodySegmentation, video, segmentation, handPose;
  let hands = [];
  let path = [];
  let spacing = 10;
  let paragraph = "A fairy godmother transformed pumpkins and mice into a shining carriage.";
  let smoothX, smoothY;
  const SMOOTHEN = 0.07;

  p.preload = function() {
    bodySegmentation = ml5.bodySegmentation("BodyPix", { flipped: true });
    handPose = ml5.handPose({ flipped: true });
  };

  p.setup = function() {
    p.createCanvas(p.windowWidth, p.windowHeight);
    video = p.createCapture(p.VIDEO, { flipped: true });
    video.size(p.windowWidth, p.windowHeight);
    video.hide();
    bodySegmentation.detectStart(video, r => { segmentation = r; });
    handPose.detectStart(video, r => { hands = r; });
  };

  p.draw = function() {
    p.background(255, 102, 0);

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

    if (segmentation) {
      p.push();
      p.tint(255, 120);
      p.image(segmentation.mask, 0, 0, p.width, p.height);
      p.pop();
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
    p.textFont('Palatino');
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

  p.windowResized = function() {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    if (video) video.size(p.windowWidth, p.windowHeight);
  };
}
