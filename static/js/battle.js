//more battle stuff ig

const canvas = document.getElementById('battleCanvas');
const ctx = canvas.getContext('2d');


// Set canvas size
canvas.width = 1900;
canvas.height = 890;
canvas.style.backgroundColor = '#000000';

/*
      # ###           #####  #  ##### /##       # ###       ##### /          ##### ##    
    /  /###  /     ######  / ######  / ##     /  /###  / ######  /        ######  /### / 
   /  /  ###/     /#   /  / /#   /  /  ##    /  /  ###/ /#   /  /        /#   /  / ###/  
  /  ##   ##     /    /  / /    /  /   ##   /  ##   ## /    /  /        /    /  /   ##   
 /  ###              /  /      /  /    /   /  ###          /  /             /  /         
##   ##             ## ##     ## ##   /   ##   ##         ## ##            ## ##         
##   ##             ## ##     ## ##  /    ##   ##         ## ##            ## ##         
##   ##           /### ##     ## ###/     ##   ##         ## ##            ## ######     
##   ##          / ### ##     ## ##  ###  ##   ##         ## ##            ## #####      
##   ##             ## ##     ## ##    ## ##   ##         ## ##            ## ##         
 ##  ##        ##   ## ##     #  ##    ##  ##  ##         #  ##            #  ##         
  ## #      / ###   #  /         /     ##   ## #      /      /                /          
   ###     /   ###    /      /##/      ###   ###     /   /##/           / /##/         / 
    ######/     #####/      /  ####    ##     ######/   /  ############/ /  ##########/  
      ###         ###      /    ##     #        ###    /     #########  /     ######     
                           #                           #                #                
                            ##                          ##               ##   
*/

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

/*
     ##### ##      ##### /    ##     /###           / /###           /   # ###        ##### #     ##      #######    
  ######  /##   ######  /  #####    /  ############/ /  ############/  /  /###     ######  /#    #### / /       ###  
 /#   /  / ##  /#   /  /     ##### /     #########  /     #########   /  /  ###   /#   /  / ##    ###/ /         ##  
/    /  /  ## /    /  ##     # ##  #     /  #       #     /  #       /  ##   ### /    /  /  ##    # #  ##        #   
    /  /   /      /  ###     #      ##  /  ##        ##  /  ##      /  ###    ###    /  /    ##   #     ###          
   ## ##  /      ##   ##     #         /  ###           /  ###     ##   ##     ##   ## ##    ##   #    ## ###        
   ## ## /       ##   ##     #        ##   ##          ##   ##     ##   ##     ##   ## ##     ##  #     ### ###      
   ## ##/        ##   ##     #        ##   ##          ##   ##     ##   ##     ##   ## ##     ##  #       ### ###    
   ## ## ###     ##   ##     #        ##   ##          ##   ##     ##   ##     ##   ## ##      ## #         ### /##  
   ## ##   ###   ##   ##     #        ##   ##          ##   ##     ##   ##     ##   ## ##      ## #           #/ /## 
   #  ##     ##   ##  ##     #         ##  ##           ##  ##      ##  ##     ##   #  ##       ###            #/ ## 
      /      ##    ## #      #          ## #      /      ## #      / ## #      /       /        ###             # /  
  /##/     ###      ###      /           ###     /        ###     /   ###     /    /##/          ##   /##        /   
 /  ########         #######/             ######/          ######/     ######/    /  #####           /  ########/    
/     ####             ####                 ###              ###         ###     /     ##           /     #####      
#                                                                                #                  |                
 ##                                                                               ##                 \)                                                                                       **                     **
*/
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
	const fontSize = Math.floor(radius * 1.0);
	ctx.fillStyle = color;
	ctx.font = `bold ${fontSize}px sans-serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText('A', cx, cy + Math.floor(radius * 0.04));
}

drawPauseIcon(1850, 50, 40, '#ffffff');
drawDoubleTriangleIcon(1750, 50, 40, '#ffffff', '#ffffff');
drawAutoBattleIconA(1650, 50, 40, '#ffffff');

/*
     ##### /##      ##### ##       # ###     /###           /    ##            ##### #     ##      # ###        ##### /          ##### ##    
  ######  / ##   ######  /### /  /  /###  / /  ############/  /####         ######  /#    #### / /  /###  /  ######  /        ######  /### / 
 /#   /  /  ##  /#   /  / ###/  /  /  ###/ /     #########   /  ###        /#   /  / ##    ###/ /  /  ###/  /#   /  /        /#   /  / ###/  
/    /  /   ## /    /  /   ##  /  ##   ##  #     /  #           /##       /    /  /  ##    # # /  ##   ##  /    /  /        /    /  /   ##   
    /  /    /      /  /       /  ###        ##  /  ##          /  ##          /  /    ##   #  /  ###           /  /             /  /         
   ## ##  /      ## ##      ##   ##           /  ###          /  ##         ## ##    ##   # ##   ##          ## ##            ## ##         
   ## ##  /       ## ##      ##   ##          ##   ##         /    ##        ## ##     ##  # ##   ##   ###    ## ##            ## ##         
   ## ###/        ## ######  ##   ##          ##   ##         /    ##        ## ##     ##  # ##   ##  /###  / ## ##            ## ######     
   ## ##  ###     ## #####   ##   ##          ##   ##        /      ##       ## ##      ## # ##   ## /  ###/  ## ##            ## #####      
   ## ##    ##    ## ##      ##   ##          ##   ##        /########       ## ##      ## # ##   ##/    ##   ## ##            ## ##         
   #  ##    ##    #  ##       ##  ##           ##  ##       /        ##      #  ##       ###  ##  ##     #    #  ##            #  ##         
      /     ##       /         ## #      /      ## #      / #        ##         /        ###   ## #      /       /                /          
  /##/      ###  /##/         / ###     /        ###     / /####      ##    /##/          ##    ###     /    /##/           / /##/         / 
 /  ####    ##  /  ##########/   ######/          ######/ /   ####    ## / /  #####              ######/    /  ############/ /  ##########/  
/    ##     #  /     ######        ###              ###  /     ##      #/ /     ##                 ###     /     #########  /     ######     
#              #                                         #                #                                #                #                
 ##             ##                                        ##               ##                               ##               ## 
*/


function roundRect(ctx, x, y, width, height, radius,
                   fillStyle = null, strokeStyle = null, lineWidth = 1,
                   text = null, textOptions = {}) {
  const { color = '#fff', font = null, clip = false, drawStrokeOnTop = false } = textOptions;

  if (radius === 'pill') radius = Math.min(width, height) / 2;
  radius = Math.min(radius, width / 2, height / 2);

  // build path
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();

  ctx.save();
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }

  if (!drawStrokeOnTop && strokeStyle) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();
  }

  if (text) {
    if (clip) ctx.clip();

    // text defaults
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (font) ctx.font = font;
    else ctx.font = `bold ${Math.floor(height * 0.45)}px sans-serif`;

    const cx = x + width / 2;
    const cy = y + height / 2;
    ctx.fillText(text, cx, cy);
  }

  // stroke on top if requested
  if (drawStrokeOnTop && strokeStyle) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();
  }
  ctx.restore();
}

//basic atk (interchangeable with targeting EX. single target, Blast, AOE)
roundRect(ctx, 1613, 845, 75, 25, 40, 'black', 'white', 2, 'Basic', { color: '#ffffff', font: 'bold 14px sans-serif' });
//skill button, same interchangeability as basic
roundRect(ctx, 1763, 745, 75, 25, 40, 'black', 'white', 2, 'Skill', { color: '#ffffff', font: 'bold 14px sans-serif' });

/*
      #######       #####                    #####  #  ##### /          ##### /       
    /       ###  ######                   ######  / ######  /        ######  /        
   /         ## /#   /  /    ##          /#   /  / /#   /  /        /#   /  /         
   ##        # /    /  /   #### /       /    /  / /    /  /        /    /  /          
    ###            /  /     /##/            /  /      /  /             /  /           
   ## ###         ## ##    / ##            ## ##     ## ##            ## ##           
    ### ###       ## ##   /                ## ##     ## ##            ## ##           
      ### ###     ## ####/               /### ##     ## ##            ## ##           
        ### /##   ## ## ###             / ### ##     ## ##            ## ##           
          #/ /##  ## ##   ###              ## ##     ## ##            ## ##           
           #/ ##  #  ##    ###        ##   ## ##     #  ##            #  ##           
            # /      /       ###     ###   #  /         /                /            
  /##        /   /##/         ###     ###    /      /##/           / /##/           / 
 /  ########/   /  #####        ###  / #####/      /  ############/ /  ############/  
/     #####    /    ###           ##/    ###      /     #########  /     #########    
|              #                                  #                #                  
 \)             ##                                 ##               ##      
*/
function drawFourPointStar(ctx, cx, cy, r, inset = Math.floor(r * 0.45),
                           fillStyle = null, strokeStyle = '#000', lineWidth = 2) {
  // cardinal points
  const top = { x: cx, y: cy - r };
  const right = { x: cx + r, y: cy };
  const bottom = { x: cx, y: cy + r };
  const left = { x: cx - r, y: cy };

  // control offsets (move toward center to create concave sides)
  const dx = inset;
  const dy = inset;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);

//actually drawing the star itself with quadratic curves because sure, why not

  // top -> right (control point located toward center: cx + dx, cy - dy)
  ctx.quadraticCurveTo(cx + dx, cy - dy, right.x, right.y);

  // right -> bottom
  ctx.quadraticCurveTo(cx + dx, cy + dy, bottom.x, bottom.y);

  // bottom -> left
  ctx.quadraticCurveTo(cx - dx, cy + dy, left.x, left.y);

  // left -> top
  ctx.quadraticCurveTo(cx - dx, cy - dy, top.x, top.y);

  ctx.closePath();

  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();
  }
  ctx.restore();
}

//Skill points
drawFourPointStar(ctx, 1300, 800, 25, 5, 'white', '#ffffff', 1);
drawFourPointStar(ctx, 1360, 800, 25, 5, 'white', '#ffffff', 1);
drawFourPointStar(ctx, 1420, 800, 25, 5, 'white', '#ffffff', 1);
//used skill points
drawFourPointStar(ctx, 1480, 800, 25, 5, '', '#ffffff', 1);
drawFourPointStar(ctx, 1540, 800, 25, 5, '', '#ffffff', 1);

/*
        ##   /###           / /###           /    ##          # ###       #####                   #######    
     /####  /  ############/ /  ############/  /####        /  /###  / ######                   /       ###  
    /  ### /     #########  /     #########   /  ###       /  /  ###/ /#   /  /    ##          /         ##  
       /## #     /  #       #     /  #           /##      /  ##   ## /    /  /   #### /        ##        #   
      /  ## ##  /  ##        ##  /  ##          /  ##    /  ###          /  /     /##/          ###          
      /  ##    /  ###           /  ###          /  ##   ##   ##         ## ##    / ##          ## ###        
     /    ##  ##   ##          ##   ##         /    ##  ##   ##         ## ##   /               ### ###      
     /    ##  ##   ##          ##   ##         /    ##  ##   ##         ## ####/                  ### ###    
    /      ## ##   ##          ##   ##        /      ## ##   ##         ## ## ###                   ### /##  
    /######## ##   ##          ##   ##        /######## ##   ##         ## ##   ###                   #/ /## 
   /        ## ##  ##           ##  ##       /        ## ##  ##         #  ##    ###                   #/ ## 
   #        ##  ## #      /      ## #      / #        ##  ## #      /      /       ###                  # /  
  /####      ##  ###     /        ###     / /####      ##  ###     /   /##/         ###       /##        /   
 /   ####    ## / ######/          ######/ /   ####    ## / ######/   /  #####        ###  / /  ########/    
/     ##      #/    ###              ###  /     ##      #/    ###    /    ###           ##/ /     #####      
#                                         #                          #                      |                
 ##                                        ##                         ##                     \)              
 */


// FIRE
var fire = new Image();
// mark ready when loaded
fire.onload = function() { fire._ready = true; };
fire.src = '../static/icons/misc/fire.png';


function drawFireCentered() {
  if (!fire._ready && !fire.complete) return;
  const w = fire.naturalWidth || fire.width || 0;
  const h = fire.naturalHeight || fire.height || 0;
  const x = (canvas.width - w) / 2;
  const y = (canvas.height - h) / 2;
  ctx.drawImage(fire, x, y, w, h);
}


canvas.addEventListener('click', function(e) {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;
  const btnX = 1650, btnY = 800, btnR = 60;
  const dx = clickX - btnX, dy = clickY - btnY;
  if (dx*dx + dy*dy <= btnR*btnR) {
    // spawn projectile from red player pog (index 2) to first enemy (index 0)
    spawnProjectile(fire, playerPogsPos[2], enemyPogsPos[0], {
      duration: 700, arc: -200, size: 0.6,
      onComplete: () => {
        gameState.flash = { t: 0, dur: 200, x: enemyPogsPos[0].x, y: enemyPogsPos[0].y };
      }
    });
  }
});

const gameState = {
  projectiles: [],
  flash: null
};

// positions matching your render() draws:
const playerPogsPos = [
  { x: 200, y: 700 },
  { x: 500, y: 700 },
  { x: 800, y: 700 }, // red pog: index 2 in your spawn call (but you used 2 -> check)
  { x: 1100, y: 700 }
];

const enemyPogsPos = [
  { x: 800, y: 200 },
  { x: 1100, y: 200 },
  { x: 1400, y: 200 },
  { x: 1700, y: 200 }
];

function render() {
  // clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // draw pogs / UI 
  // players
  drawCircle(200, 700, 50, '#00ff00');
  drawCircle(500, 700, 50, '#0000ff');
  drawCircle(800, 700, 50, '#ff0000'); // red pog
  drawCircle(1100, 700, 50, '#ffff00');

  // enemies
  drawCircle(800, 200, 50, '#00ffff');
  drawCircle(1100, 200, 50, '#ff00ff');
  drawCircle(1400, 200, 50, '#ffffff');
  drawCircle(1700, 200, 50, '#888888');

  // UI (buttons)
  drawCircle(1650, 800, 60, '', '#ffffff');
  drawCircle(1800, 700, 60, '', '#ffffff');
  drawCircle(1850, 50, 40, '', '#ffffff');
  drawCircle(1750, 50, 40, '', '#ffffff');
  drawCircle(1650, 50, 40, '', '#ffffff');

  drawPauseIcon(1850, 50, 40, '#ffffff');
drawDoubleTriangleIcon(1750, 50, 40, '#ffffff', '#ffffff');
drawAutoBattleIconA(1650, 50, 40, '#ffffff');


  roundRect(ctx, 1613, 845, 75, 25, 40, 'black', 'white', 2, 'Basic', { color: '#ffffff', font: 'bold 14px sans-serif' });
  roundRect(ctx, 1763, 745, 75, 25, 40, 'black', 'white', 2, 'Skill', { color: '#ffffff', font: 'bold 14px sans-serif' });

  // draw projectiles on top
  for (const prj of gameState.projectiles) renderProjectile(prj);
}

function update(dt) { 
  for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
    const prj = gameState.projectiles[i];
    prj.elapsed += dt;
    if (prj.elapsed >= prj.duration) {
      // complete
      if (typeof prj.onComplete === 'function') prj.onComplete();
      gameState.projectiles.splice(i, 1);
    }
  }

  // TODO: advance other animations / timers / cooldowns here
}

let lastTime = performance.now();
let loopRunning = true;
function mainLoop(now) {
  if (!loopRunning) return;
  const dt = now - lastTime;
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(mainLoop);
}

requestAnimationFrame(mainLoop);


canvas.addEventListener('click', function(e) {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  const dx = clickX - 1650, dy = clickY - 800;
  if (dx * dx + dy * dy <= 60 * 60) {

    spawnProjectile(fire, playerPogsPos[2], enemyPogsPos[0], { duration: 700, arc: -200, size: 0.6,
      onComplete: () => {
        // impact effect: small flash
        const flash = { t: 0, dur: 200, x: enemyPogsPos[0].x, y: enemyPogsPos[0].y };

        gameState.flash = flash;
      }
    });
  }
});

function spawnProjectile(img, startPos, endPos, opts = {}) {
  const prj = {
    img,
    start: { x: startPos.x, y: startPos.y },
    end: { x: endPos.x, y: endPos.y },
    elapsed: 0,
    duration: opts.duration || 700,
    arc: typeof opts.arc === 'number' ? opts.arc : -100,
    size: opts.size || 1.0,
    onComplete: opts.onComplete || null
  };
  gameState.projectiles.push(prj);
  return prj;
}

function getProjectilePosition(prj) {
  const t = Math.min(1, prj.elapsed / prj.duration);
  // simple ease-out or linear:
  const ease = 1 - Math.pow(1 - t, 2); // ease-out
  const x = prj.start.x + (prj.end.x - prj.start.x) * ease;
  const y = prj.start.y + (prj.end.y - prj.start.y) * ease;
  // add arc (a simple quadratic offset based on t)
  const arc = prj.arc * (4 * (t - t * t)); // 0 at 0 and 1, peak at t=0.5
  return { x, y: y + arc };
}

function renderProjectile(prj) {
  const pos = getProjectilePosition(prj);
  // if using an image
  if (prj.img && (prj.img._ready || prj.img.complete)) {
    const w = (prj.img.naturalWidth || prj.img.width) * (prj.size || 1);
    const h = (prj.img.naturalHeight || prj.img.height) * (prj.size || 1);
    ctx.drawImage(prj.img, pos.x - w/2, pos.y - h/2, w, h);
  } else {
    // fallback: draw a simple circle
    drawCircle(pos.x, pos.y, 12 * (prj.size || 1), '#ff6600');
  }
}