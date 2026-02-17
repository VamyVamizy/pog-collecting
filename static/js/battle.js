//more battle stuff ig

const canvas = document.getElementById('battleCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 1900;
canvas.height = 890;
canvas.style.backgroundColor = '#000000';

function drawCircle(x, y, r, fillStyle = '#ffffff', strokeStyle = null) {
	if (!ctx) return;
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2);
	if (fillStyle) {
		ctx.fillStyle = fillStyle;
		ctx.fill();
	}
	if (strokeStyle) {
		ctx.strokeStyle = strokeStyle;
		ctx.stroke();
	}
	ctx.closePath();
}

//player pogs
const pog1 = drawCircle(200, 700, 50, '#00ff00');
const pog2 = drawCircle(500, 700, 50, '#0000ff');
const pog3 = drawCircle(800, 700, 50, '#ff0000');
const pog4 = drawCircle(1100, 700, 50, '#ffff00');  

//enemy pogs
const enemyPog1 = drawCircle(800, 200, 50, '#00ffff');
const enemyPog2 = drawCircle(1100, 200, 50, '#ff00ff');
const enemyPog3 = drawCircle(1400, 200, 50, '#ffffff');
const enemyPog4 = drawCircle(1700, 200, 50, '#888888'); 

//buttons
const basicAttack = drawCircle(1650, 800, 60, '', '#ffffff');
const specialAttack = drawCircle(1800, 700, 60, '', '#ffffff');

//Upper right UI menu with pause, speed up, and auto battle buttons
const pauseButton = drawCircle(1850, 50, 40, '', '#ffffff');
const speedButton = drawCircle(1750, 50, 40, '', '#ffffff');
const autoBattleButton = drawCircle(1650, 50, 40, '', '#ffffff');

function drawPauseIcon(cx, cy, radius, color = '#ffffff') {
	// two vertical bars centered
	const barWidth = Math.max(4, Math.floor(radius * 0.18));
	const barHeight = Math.floor(radius * 0.9);
	const gap = Math.floor(radius * 0.2);
	const leftX = cx - gap - barWidth;
	const rightX = cx + gap;
	const topY = cy - Math.floor(barHeight / 2);

	ctx.fillStyle = color;
	// left bar
	ctx.fillRect(leftX, topY, barWidth, barHeight);
	// right bar
	ctx.fillRect(rightX, topY, barWidth, barHeight);
}

function drawDoubleTriangleIcon(cx, cy, radius, outerColor = '#ffffff', innerColor = '#ffffff') {
	// draw two right-pointing triangles, one slightly smaller and offset to create a 'speed' icon
	const w = Math.floor(radius * 0.9);
	const h = Math.floor(radius * 0.7);

	// outer triangle (stroke)
	ctx.beginPath();
	ctx.moveTo(cx - Math.floor(w / 2), cy - Math.floor(h / 2));
	ctx.lineTo(cx + Math.floor(w / 2), cy);
	ctx.lineTo(cx - Math.floor(w / 2), cy + Math.floor(h / 2));
	ctx.closePath();
	ctx.fillStyle = outerColor;
	ctx.globalAlpha = 0.6;
	ctx.fill();
	ctx.globalAlpha = 1.0;

	// inner triangle slightly shifted right to overlap partially
	const shift = Math.max(6, Math.floor(radius * 0.18));
	ctx.beginPath();
	ctx.moveTo(cx - Math.floor(w / 2) + shift, cy - Math.floor(h / 2));
	ctx.lineTo(cx + Math.floor(w / 2) + shift, cy);
	ctx.lineTo(cx - Math.floor(w / 2) + shift, cy + Math.floor(h / 2));
	ctx.closePath();
	ctx.fillStyle = innerColor;
	ctx.fill();
}

function drawAutoBattleIconA(cx, cy, radius, color = '#ffffff') {
	// draw a bold 'A' centered in the button
	const fontSize = Math.floor(radius * 1.0);
	ctx.fillStyle = color;
	ctx.font = `bold ${fontSize}px sans-serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	// small vertical offset to optically center the 'A'
	ctx.fillText('A', cx, cy + Math.floor(radius * 0.04));
}

// draw icons on top of the button circles
drawPauseIcon(1850, 50, 40, '#ffffff');
drawDoubleTriangleIcon(1750, 50, 40, '#ffffff', '#ffffff');
drawAutoBattleIconA(1650, 50, 40, '#ffffff');

let roundRect = (ctx, x0, y0, x1, y1, r, color) => {
      var w = x1 - x0;
      var h = y1 - y0;
      if (r > w/2) r = w/2;
      if (r > h/2) r = h/2;
      ctx.beginPath();
      ctx.moveTo(x1 - r, y0);
      ctx.quadraticCurveTo(x1, y0, x1, y0 + r);
      ctx.lineTo(x1, y1-r);
      ctx.quadraticCurveTo(x1, y1, x1 - r, y1);
      ctx.lineTo(x0 + r, y1);
      ctx.quadraticCurveTo(x0, y1, x0, y1 - r);
      ctx.lineTo(x0, y0 + r);
      ctx.quadraticCurveTo(x0, y0, x0 + r, y0);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
  };
  
roundRect(ctx, 50, 50, 150, 100, 5, "#F00");