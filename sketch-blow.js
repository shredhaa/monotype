function sketchBlow(p) {

  let video, faceMesh;
  let faces = [];
  let previousLipDistance;
  let words = [];

  let boxX, boxY, boxW, boxH;
  let lastFaceTime = 0;

  p.setup = function () {
    p.createCanvas(p.windowWidth, p.windowHeight);

    video = p.createCapture(p.VIDEO, { flipped: true });
    video.size(p.windowWidth, p.windowHeight);
    video.hide();

    // ---------- FACEMESH ----------
    faceMesh = ml5.faceMesh({
      maxFaces: 1,
      refineLandmarks: true,
      flipped: true
    });

    faceMesh.ready.then(() => {
      console.log("FaceMesh ready");

      faceMesh.detectStart(video, r => {
        if (p.millis() - lastFaceTime > 50) {
          faces = r;
          lastFaceTime = p.millis();
        }
      });
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
    let paragraph =
      "In a quiet house at the edge of the village lived a girl who worked among the ashes. She moved gently through the rooms, sweeping the floor and tending the fire without complaint. When her stepmother spoke, she bowed her head and answered softly.";

    let fs = globalFontSize || 19;
    p.textFont("Palatino");
    p.textSize(fs);

    let lineH = fs * 1.6;
    let padding = 20;
    let maxLineW = boxW - padding * 2;

    let lines = [];
    let currentLine = [];
    let currentLineW = 0;

    let wordChunks = paragraph.split(" ");

    for (let wi = 0; wi < wordChunks.length; wi++) {
      let word = wordChunks[wi] + (wi < wordChunks.length - 1 ? " " : "");
      let wordW = p.textWidth(word);

      if (currentLineW + wordW > maxLineW && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = [];
        currentLineW = 0;
      }

      for (let ci = 0; ci < word.length; ci++) {
        let cw = p.textWidth(word[ci]);
        currentLine.push({ char: word[ci], w: cw });
        currentLineW += cw;
      }
    }
    if (currentLine.length > 0) lines.push(currentLine);

    let totalH = lines.length * lineH;
    let startY = boxY + (boxH - totalH) / 2;

    for (let li = 0; li < lines.length; li++) {
      let line = lines[li];
      let lineW = line.reduce((sum, c) => sum + c.w, 0);
      let startX = boxX + padding + (maxLineW - lineW) / 2;
      let xCursor = startX;
      for (let ci = 0; ci < line.length; ci++) {
        words.push(new Word(line[ci].char, xCursor, startY + li * lineH));
        xCursor += line[ci].w;
      }
    }
  }

  class Word {
    constructor(char, hx, hy) {
      this.char = char;
      this.position = p.createVector(hx, hy);
      this.velocity = p.createVector(0, 0);
      this.acceleration = p.createVector(0, 0);
      this.angle = 0;
      this.angleV = 0;
    }
    applyForce(force) { this.acceleration.add(force); }
    update() {
      this.velocity.add(this.acceleration);
      this.velocity.mult(0.92);
      this.position.add(this.velocity);
      this.acceleration.mult(0);
      this.angle += this.angleV;
      this.angleV *= 0.95;
    }
    display() {
      let fs = globalFontSize || 19;
      p.push();
      p.translate(this.position.x, this.position.y);
      p.rotate(this.angle);
      p.fill(0);
      p.noStroke();
      p.textFont("Palatino");
      p.textSize(fs);
      p.textAlign(p.LEFT, p.TOP);
      p.text(this.char, 0, 0);
      p.pop();
    }
  }

  p.draw = function () {
    p.background(224, 255, 0);

    // ---------- FACEMESH BLOW ----------
    if (faces.length > 0) {
      let keypoints = faces[0].keypoints;
      let upperLip = keypoints[13];
      let lowerLip = keypoints[14];

      if (upperLip && lowerLip) {
        let lipDistance = p.dist(upperLip.x, upperLip.y, lowerLip.x, lowerLip.y);
        let mouthCenter = p.createVector((upperLip.x + lowerLip.x) / 2, (upperLip.y + lowerLip.y) / 2);

        if (previousLipDistance !== undefined &&
            previousLipDistance > 20 &&
            previousLipDistance - lipDistance > 2) {
          let blowStrength = p.map(previousLipDistance - lipDistance, 2, 30, 1, 6);
          blowStrength = p.constrain(blowStrength, 1, 6);
          for (let w of words) trigger(w, mouthCenter, blowStrength);
        }

        previousLipDistance = lipDistance;
      }

      // Draw lip keypoints
      let lipIndices = [
        61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291,
        375, 321, 405, 314, 17, 84, 181, 91, 146,
        78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308,
        324, 318, 402, 317, 14, 87, 178, 88, 95
      ];
      for (let idx of lipIndices) {
        if (keypoints[idx]) {
          let kp = keypoints[idx];
          p.noStroke();
          p.fill(255, 0, 200, 200);
          p.circle(kp.x, kp.y, 5);
        }
      }
    }

    for (let w of words) { w.update(); w.display(); }
  };

  function trigger(word, mouth, blowStrength) {
    let force = p5.Vector.sub(word.position, mouth);
    let distance = force.mag();
    force.normalize();
    let magnitude = p.map(distance, 0, p.width, 0.1, 1) * p.random(0.1, 1) * blowStrength;
    force.mult(magnitude);
    word.applyForce(force);
    word.angleV = p.map(distance, 0, p.width, 0.01, 0.1) * p.random(0.5, 2) * blowStrength;
  }

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
