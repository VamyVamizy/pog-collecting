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
// Image-backed pog rendering
// A simple in-file loader/drawer that draws an image centered at a point
// with a given radius. If the image is not ready, it falls back to drawing
// the circle so the UI remains responsive.
const pogImages = {};

function loadPogImage(key, src) {
  try {
    const img = new Image();
    img.onload = () => { img._ready = true; };
    img.onerror = () => { img._ready = false; img._error = true; };
    img.src = src;
    pogImages[key] = img;
    return img;
  } catch (e) {
    console.error('Failed to load pog image', key, src, e);
    return null;
  }
}

// Try a list of candidate URLs in order until one successfully loads.
function loadPogImageVariants(key, candidates) {
  if (!Array.isArray(candidates)) candidates = [String(candidates)];
  try {
    const img = new Image();
    img._ready = false;
    img._error = false;
    img._tried = 0;

    function tryNext() {
      if (img._tried >= candidates.length) {
        img._error = true;
        img._ready = false;
        try { console.warn('loadPogImageVariants: all candidates failed', key, candidates); } catch (e) {}
        return;
      }
      const s = candidates[img._tried++];
      // assign src to start loading; onerror will trigger tryNext()
      try {
        img.src = s;
      } catch (e) {
        // on some browsers setting src can throw for invalid URLs; continue
        tryNext();
      }
    }

  img.onload = () => { img._ready = true; try { console.log('loadPogImageVariants: loaded', key, img.src); } catch (e) {} };
    img.onerror = () => { tryNext(); };

    pogImages[key] = img;
    // kick off
    tryNext();
    return img;
  } catch (e) {
    console.error('loadPogImageVariants failed', key, e);
    return null;
  }
}

function drawPogImage(key, x, y, r, fallbackColor = '#ffffff') {
  const img = pogImages[key];
  // Defensive: only call drawImage when the image actually has data.
  // Some browsers mark errored images as `.complete === true` but they
  // have no naturalWidth/Height and will throw when drawn. Check those.
  if (img && (img._ready || (img.complete && img.naturalWidth && img.naturalHeight))) {
    // maintain aspect ratio and draw within a square of size 2*r
    const w = (img.naturalWidth || img.width) || (2 * r);
    const h = (img.naturalHeight || img.height) || (2 * r);
    // scale to fit 2*r box while preserving aspect
    const scale = Math.min((2 * r) / w, (2 * r) / h);
    const dw = Math.max(1, Math.floor(w * scale));
    const dh = Math.max(1, Math.floor(h * scale));
    try {
      ctx.drawImage(img, x - dw / 2, y - dh / 2, dw, dh);
    } catch (e) {
      // If drawing still fails, mark image as broken and fallback to circle.
      try { console.warn('drawPogImage: drawImage failed, falling back', key, e); } catch (e2) {}
      drawCircle(x, y, r, fallbackColor);
    }
  } else {
    // fallback circle while image loads or on error
    drawCircle(x, y, r, fallbackColor);
  }
}

const embeddedPogList = (() => {
  try {
    const el = document.getElementById('pogList');
    return el ? JSON.parse(el.textContent || el.innerText || '[]') : (window.pogList || []);
  } catch (e) { return window.pogList || []; }
})();

const embeddedUserdata = (() => {
  try {
    const el = document.getElementById('userdata');
    return el ? JSON.parse(el.textContent || el.innerText || '{}') : (window.userdata || {});
  } catch (e) { return window.userdata || {}; }
})();

const playerPogKeys = ['pog1','pog2','pog3','pog4'];

const playerPogMeta = [null, null, null, null];

// enemy slots (will be populated by initEnemyLoadout)
const enemyPogKeys = ['enemy1','enemy2','enemy3','enemy4'];
const enemyPogMeta = [null, null, null, null];

// Helper: given a loadout item (object or string/number), resolve it to a
// pogList entry and start loading its image. Returns true if an image was queued.
function resolveAndLoadPogSlot(item, slotIndex, keyPrefix, keysArr, metaArr) {
  if (!item) return false;

  let lookupId = null;
  let lookupName = null;
  if (typeof item === 'object') {
    lookupId = item.id || item.ID || item.pogid || item.pogId || null;
    lookupName = item.name || item.displayname || null;
  } else if (typeof item === 'string' || typeof item === 'number') {
    if (String(item).match(/^\d+$/)) lookupId = item;
    else lookupName = String(item);
  }

  // Find the pog in the embedded full pog list
  let pog = null;
  if (lookupId !== null) {
    pog = embeddedPogList.find(p => String(p.id) === String(lookupId));
  }
  if (!pog && lookupName) {
    pog = embeddedPogList.find(p =>
      String(p.name) === String(lookupName) ||
      String(p.code) === String(lookupName) ||
      String(p.code2) === String(lookupName)
    );
  }

  const code = pog && (pog.code2 || pog.code);
  if (code) {
    const key = keyPrefix + (slotIndex + 1);
    const candidates = makeCandidatesForCode(code);
    console.log(keyPrefix + ' slot ' + slotIndex + ': resolved code2=' + code, '| first candidates:', candidates.slice(0, 4));
    loadPogImageVariants(key, candidates);
    keysArr[slotIndex] = key;
    metaArr[slotIndex] = { code2: pog.code2, code: pog.code, name: pog.name, id: pog.id };
    return true;
  }

  // Fallback: try to use the name directly as a filename guess
  const name = lookupName || (pog && pog.name) || null;
  if (name) {
    const key = keyPrefix + (slotIndex + 1);
    const candidates = makeCandidatesForCode(name);
    console.log(keyPrefix + ' slot ' + slotIndex + ': guessed name=' + name, '| first candidates:', candidates.slice(0, 4));
    loadPogImageVariants(key, candidates);
    keysArr[slotIndex] = key;
    metaArr[slotIndex] = { guessedName: name };
    return true;
  }

  return false;
}

async function initPlayerLoadout() {
  // --- Source 1: Server API (persisted across devices) ---
  let loadoutsResp = null;
  try {
    const resp = await fetch('/api/user/team', { credentials: 'same-origin' });
    if (resp && resp.ok) loadoutsResp = await resp.json();
  } catch (e) {
    console.warn('Failed to fetch /api/user/team', e);
  }

  // --- Source 2: localStorage (same key teamSelect.js uses) ---
  let localLoadouts = null;
  let localSelected = 0;
  try {
    const raw = localStorage.getItem('pog_team_loadouts_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) localLoadouts = parsed;
    }
  } catch (e) { /* ignore */ }

  // Merge: prefer server data if available, fall back to localStorage
  let selectedIndex = 0;
  let selectedLoadout = null;

  if (loadoutsResp && Array.isArray(loadoutsResp.loadouts)) {
    selectedIndex = typeof loadoutsResp.selected === 'number' ? loadoutsResp.selected : 0;
    selectedLoadout = loadoutsResp.loadouts[selectedIndex] || loadoutsResp.loadouts.find(l => l != null) || null;
    console.log('initPlayerLoadout: using SERVER loadout, selected=' + selectedIndex, selectedLoadout);
  }
  if (!selectedLoadout && localLoadouts) {
    selectedIndex = typeof window.currentLoadoutIndex === 'number' ? window.currentLoadoutIndex : 0;
    selectedLoadout = localLoadouts[selectedIndex] || localLoadouts.find(l => l != null) || null;
    console.log('initPlayerLoadout: using LOCALSTORAGE loadout, selected=' + selectedIndex, selectedLoadout);
  }
  if (!selectedLoadout && Array.isArray(window.currentTeam) && window.currentTeam.length) {
    selectedLoadout = window.currentTeam;
    console.log('initPlayerLoadout: using window.currentTeam', selectedLoadout);
  }

  if (!selectedLoadout || !Array.isArray(selectedLoadout) || selectedLoadout.length === 0) {
    // No loadout at all — pick first 4 pogs from pogList as defaults
    console.warn('No saved loadout found. Picking first 4 pogs from pogList as defaults.');
    const pool = embeddedPogList.filter(p => p && (p.code2 || p.code));
    for (let i = 0; i < 4; i++) {
      if (pool[i]) {
        resolveAndLoadPogSlot(pool[i], i, 'player', playerPogKeys, playerPogMeta);
      }
    }
    console.log('Player loadout (defaults) ->', playerPogKeys, playerPogMeta);
    return;
  }

  // Map each loadout slot to an image
  for (let i = 0; i < 4; i++) {
    const item = selectedLoadout[i];
    if (!resolveAndLoadPogSlot(item, i, 'player', playerPogKeys, playerPogMeta)) {
      playerPogKeys[i] = 'pog' + (i + 1);
      playerPogMeta[i] = null;
    }
  }
  console.log('Player loadout mapped ->', playerPogKeys, playerPogMeta);
}

// initialize player loadout as soon as possible
// initialize player loadout and then enemy loadout
initPlayerLoadout().then(() => {
  try { initEnemyLoadout(); } catch (e) { console.warn('initEnemyLoadout failed', e); }
}).catch(e => console.warn('initPlayerLoadout failed', e));

function initEnemyLoadout() {
  // For now, pick 4 random pogs from the list (skip the first 4 used by player defaults)
  const usedIds = new Set(playerPogMeta.filter(Boolean).map(m => String(m.id || '')));
  const pool = embeddedPogList.filter(p => p && (p.code2 || p.code) && !usedIds.has(String(p.id)));
  // Shuffle and pick 4
  const shuffled = pool.sort(() => Math.random() - 0.5);
  for (let i = 0; i < 4; i++) {
    const pog = shuffled[i] || null;
    if (pog) {
      resolveAndLoadPogSlot(pog, i, 'enemy', enemyPogKeys, enemyPogMeta);
    }
  }
  console.log('Enemy loadout ->', enemyPogKeys, enemyPogMeta);
}

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
  // ensure the image actually has dimensions (not a broken image)
  const hasSize = (fire.naturalWidth && fire.naturalHeight) || (fire.width && fire.height);
  if (!hasSize) return;
  const w = fire.naturalWidth || fire.width || 0;
  const h = fire.naturalHeight || fire.height || 0;
  const x = (canvas.width - w) / 2;
  const y = (canvas.height - h) / 2;
  try {
    ctx.drawImage(fire, x, y, w, h);
  } catch (e) {
    try { console.warn('drawFireCentered drawImage failed', e); } catch (e2) {}
  }
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
/*
                                                                                
      # ###           ##### /          # ###          # ###         ##### ##    
    /  /###  /     ######  /         /  /###        /  /###      ######  /###   
   /  /  ###/     /#   /  /         /  /  ###      /  /  ###    /#   /  /  ###  
  /  ##   ##     /    /  /         /  ##   ###    /  ##   ###  /    /  /    ### 
 /  ###              /  /         /  ###    ###  /  ###    ###     /  /      ## 
##   ##             ## ##        ##   ##     ## ##   ##     ##    ## ##      ## 
##   ##   ###       ## ##        ##   ##     ## ##   ##     ##    ## ##      ## 
##   ##  /###  /    ## ##        ##   ##     ## ##   ##     ##  /### ##      /  
##   ## /  ###/     ## ##        ##   ##     ## ##   ##     ## / ### ##     /   
##   ##/    ##      ## ##        ##   ##     ## ##   ##     ##    ## ######/    
 ##  ##     #       #  ##         ##  ##     ##  ##  ##     ##    ## ######     
  ## #      /          /           ## #      /    ## #      /     ## ##         
   ###     /       /##/           / ###     /      ###     /      ## ##         
    ######/       /  ############/   ######/        ######/       ## ##         
      ###        /     #########       ###            ###    ##   ## ##         
                 #                                          ###   #  /          
                  ##                                         ###    /           
                                                              #####/            
                                                                ###                                                                                                                         ###  
*/
const gameState = {
  projectiles: [],
  flash: null
};

// positions matching render() draws:
const playerPogsPos = [
  { x: 200, y: 700 },
  { x: 500, y: 700 },
  { x: 800, y: 700 }, // red pog: index 2 in your spawn call (but 2 -> check was used)
  { x: 1100, y: 700 }
];

const enemyPogsPos = [
  { x: 800, y: 200 }, // void stalker
  { x: 1100, y: 200 }, // shadow beast
  { x: 1400, y: 200 }, // crystal golem
  { x: 1700, y: 200 } // dark sentinel (defeated)
];

function render() {
  // clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw enemy panel (replaces simple enemy circles)
  drawEnemyPanelUI();

  // Draw character panel
  drawCharacterPanelUI();

  // draw turn timeline
  drawTurnTimeline();

  // UI buttons (keep existing)
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

  // Skill points (keep existing)
  drawFourPointStar(ctx, 1300, 800, 25, 5, 'white', '#ffffff', 1);
  drawFourPointStar(ctx, 1360, 800, 25, 5, 'white', '#ffffff', 1);
  drawFourPointStar(ctx, 1420, 800, 25, 5, 'white', '#ffffff', 1);
  drawFourPointStar(ctx, 1480, 800, 25, 5, '', '#ffffff', 1);
  drawFourPointStar(ctx, 1540, 800, 25, 5, '', '#ffffff', 1);

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

try { console.log && console.log('battle.js loaded'); } catch (e) {}

let lastTime = performance.now();
let loopRunning = true;
function drawFatalErrorOverlay(err) {
  try {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0,0,0,0.95)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ff6666';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const msg = 'Battle script error: ' + (err && err.message ? err.message : String(err));
    const lines = msg.match(/.{1,80}/g) || [msg];
    let y = 20;
    for (const ln of lines) { ctx.fillText(ln, 20, y); y += 26; }
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px monospace';
    ctx.fillText('Open developer console for full stack (F12).', 20, y + 10);
    ctx.restore();
  } catch (e) {
    try { console.error('Failed to draw error overlay', e); } catch (e2) {}
  }
}

function mainLoop(now) {
  if (!loopRunning) return;
  try {
    const dt = now - lastTime;
    lastTime = now;
    update(dt);
    render();
  } catch (err) {
    // prevent the loop from silently stopping -- log and draw overlay
    try { console.error('Unhandled error in battle loop', err); } catch (e) {}
    drawFatalErrorOverlay(err);
    // stop the loop to avoid spamming more errors
    loopRunning = false;
    return;
  }
  requestAnimationFrame(mainLoop);
}

requestAnimationFrame(mainLoop);


canvas.addEventListener('click', function(e) {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  const pauseX = 1850, pauseY = 50, pauseR = 40;
  const pdx = clickX - pauseX, pdy = clickY - pauseY;
  if (pdx * pdx + pdy * pdy <= pauseR * pauseR) {
    const ok = confirm('Return to main page? Your current battle progress will be lost.');
    if (ok) {
      // navigate to the app root (main page)
      window.location.href = '/';
      return;
    }
  }

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
  if (prj.img && (prj.img._ready || (prj.img.complete && prj.img.naturalWidth && prj.img.naturalHeight))) {
    const w = (prj.img.naturalWidth || prj.img.width) * (prj.size || 1);
    const h = (prj.img.naturalHeight || prj.img.height) * (prj.size || 1);
    try {
      ctx.drawImage(prj.img, pos.x - w/2, pos.y - h/2, w, h);
    } catch (e) {
      try { console.warn('renderProjectile: drawImage failed for projectile image', e); } catch (e2) {}
      // fallback to circle so we don't crash the render loop
      drawCircle(pos.x, pos.y, 12 * (prj.size || 1), '#ff6600');
    }
  } else {
    // fallback: draw a simple circle
    drawCircle(pos.x, pos.y, 12 * (prj.size || 1), '#ff6600');
  }
}
/*
   ##### /  ##     ##### ##    # ###      ##### ##      ##### ######## ##### #####   
######  /####   ######  /### /  /###   ######  /##   ######  /#######/ ####/ ####    
#   /  / ###   /#   /  / ###/  /  ###  /#   /  / ##  /#   /  /##   /   ###  /##      
   /  /   ##  /    /  /   ##  /    ###    /  /   ## /    /  / ##  /    ##  /##       
  ## ##    ## ##  /##/    ##  ##     ##   ## ##   ## ##  /##/ ## /     ## /##        
  ## ##    ##    /##      ## ###     ##   ## ##   ##    /##  ##/      ##/##         
  ## ######/    /##       ## ##      ##   ## ##   ##   /##   ##       ###           
  ## #####     /##        ## ##      ##   ## ##   ##  /##    ##       ##            
  ## ##       /##         ## ##      ##   ## ##   ## /##     ##       ##            
  ## ##      /##          ## ##      ##   ## ##   ##/##      ##       ##            
  #  ##     /##           #  ##      ##   #  ##   ###       ##        ##            
     /     /##               /      ##       /     ##        /         ##            
/##/     /##            /##/      ##    /##/      ##    /##/          ##             
######  /##            ######    ##    ######    ##   ######         ##              
###   /##               ###     ##      ###     ##     ###           ##              
*/

// Character data structure
const characters = [
    {
        name: "Character 1",
        maxHp: 100,
        currentHp: 85,
        maxEnergy: 100,
        currentEnergy: 60,
        color: '#00ff00',
        position: { x: 200, y: 700 }
    },
    {
        name: "Character 2", 
        maxHp: 120,
        currentHp: 120,
        maxEnergy: 80,
        currentEnergy: 20,
        color: '#0000ff',
        position: { x: 500, y: 700 }
    },
    {
        name: "Character 3",
        maxHp: 90,
        currentHp: 45,
        maxEnergy: 120,
        currentEnergy: 100,
        color: '#ff0000',
        position: { x: 800, y: 700 }
    },
    {
        name: "Character 4",
        maxHp: 110,
        currentHp: 110,
        maxEnergy: 90,
        currentEnergy: 75,
        color: '#ffff00',
        position: { x: 1100, y: 700 }
    }
];
// enemy data structure 
const enemies = [
  {
    name: "Void Stalker",
    maxHp: 150,
    currentHp: 120,
    color: '#00ffff',
    position: { x: 800, y: 200 }
  },
  {
    name: "Shadow beast",
    maxHp: 200,
    currentHp: 200,
    color: '#ff00ff',
    position: { x: 1100, y: 200 }
  },
  {
    name: "Crystal Golem",
    maxHp: 300,
    currentHp: 75,
    color: '#ffffff',
    position: { x: 1400, y: 200 }
  },
  {
    name: "Dark Sentinel",
    maxHp: 180,
    currentHp: 0,
    color: '#888888',
    position: { x: 1700, y: 200 }
  }
];
/*
##### ###  ### ##     ###  ### ##### /          ##### ##    ##### ###    ##### #####  ##### ##    
####  /###/ ####     ###  / ######  /        ######  /### ######  /### ######  /### ######  /###  
###  /  ###  ###    ###  /  /#   /  /        /#   /  / ## #   /  / ### #   /  / ### #   /  / ##   
##  /    ##  ##    ###  /      /  /             /  /  ##    /  /   ##    /  /   ##    /  /  ##    
## ##     ## ##   ###  /      ## ##            ## ##  ##   ## ##   ##   ## ##   ##   ## ##  ##    
## ##     ## ##  ###  /       ## ##            ## ##  ##   ## ##   ##   ## ##   ##   ## ##  ##    
## ##     ## ## ###  /        ## ##            ## ##  ##   ## ##   ##   ## ##   ##   ## ##  ##    
## ##     ## ######/          ## ##            ## ##  ##   ## ##   ##   ## ##   ##   ## ##  ##    
## ##     ## ####             ## ##            ## ##  ##   ## ##   ##   ## ##   ##   ## ##  ##    
## ##     ## ##               ## ##            ## ##  ##   ## ##   ##   ## ##   ##   ## ##  ##    
#  ##     ## ##               #  ##            #  ##  ##   #  ##   ##   #  ##   ##   #  ##  ##    
   /      ## ##                  /                /   ##      /    ##      /    ##      /   ##    
/##/      ## ##              /##/            /##/    ##  /##/     ##  /##/     ##  /##/    ##     
######    ## ##             ######          ######   ## ######    ## ######    ## ######   ##     
###       ## ##              ###             ###     ##  ###      ##  ###      ##  ###     ##     
*/

// Turn order and speed system
const turnOrder = {
    queue: [], // Array of turn participants
    currentTurn: 0,
    turnCounter: 1
};

// Speed values for characters and enemies
const speedStats = {
    characters: [
        { id: 'char1', speed: 120, name: 'Character 1' },
        { id: 'char2', speed: 95, name: 'Character 2' },
        { id: 'char3', speed: 110, name: 'Character 3' },
        { id: 'char4', speed: 85, name: 'Character 4' }
    ],
    enemies: [
        { id: 'enemy1', speed: 100, name: 'Void Stalker' },
        { id: 'enemy2', speed: 90, name: 'Shadow beast' },
        { id: 'enemy3', speed: 75, name: 'Crystal Golem' },
        { id: 'enemy4', speed: 0, name: 'Dark Sentinel' } // Defeated = 0 speed
    ]
};

// Calculate turn order based on speed
function calculateTurnOrder() {
    const allUnits = [];
    
    // Add alive characters
    speedStats.characters.forEach((char, index) => {
        if (characters[index].currentHp > 0) {
            allUnits.push({
                ...char,
                type: 'character',
                index: index,
                color: characters[index].color,
                hp: characters[index].currentHp,
                maxHp: characters[index].maxHp
            });
        }
    });
    
    // Add alive enemies
    speedStats.enemies.forEach((enemy, index) => {
        if (enemies[index].currentHp > 0) {
            allUnits.push({
                ...enemy,
                type: 'enemy',
                index: index,
                color: enemies[index].color,
                hp: enemies[index].currentHp,
                maxHp: enemies[index].maxHp
            });
        }
    });
    
    // Sort by speed (highest first)
    allUnits.sort((a, b) => b.speed - a.speed);
    
    // Create extended queue (show next 8-10 turns)
    turnOrder.queue = [];
    for (let i = 0; i < 10; i++) {
        turnOrder.queue.push(...allUnits);
    }
    
    return turnOrder.queue.slice(0, 10); // Return first 10 turns
}

// Draw character health bar
function drawHealthBar(x, y, width, height, currentHp, maxHp, bgColor = '#333', fillColor = '#4CAF50') {
    // Background
    roundRect(ctx, x, y, width, height, 4, bgColor, '#666', 1);
    
    // Health fill
    const healthPercent = Math.max(0, currentHp / maxHp);
    const fillWidth = (width - 4) * healthPercent;
    
    if (fillWidth > 0) {
        // Color based on health percentage
        let healthColor = fillColor;
        if (healthPercent < 0.25) healthColor = '#f44336'; // Red for low health
        else if (healthPercent < 0.5) healthColor = '#ff9800'; // Orange for medium health
        
        roundRect(ctx, x + 2, y + 2, fillWidth, height - 4, 2, healthColor);
    }
    
    // Health text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${currentHp}/${maxHp}`, x + width/2, y + height/2);
}

// Draw energy bar (smaller, below health)
function drawEnergyBar(x, y, width, height, currentEnergy, maxEnergy) {
    // Background
    roundRect(ctx, x, y, width, height, 3, '#1a1a2e', '#444', 1);
    
    // Energy fill
    const energyPercent = Math.max(0, currentEnergy / maxEnergy);
    const fillWidth = (width - 2) * energyPercent;
    
    if (fillWidth > 0) {
        // Purple/blue gradient for energy
        const gradient = ctx.createLinearGradient(x, y, x + width, y);
        gradient.addColorStop(0, '#9c27b0');
        gradient.addColorStop(1, '#3f51b5');
        
        roundRect(ctx, x + 1, y + 1, fillWidth, height - 2, 2, gradient);
    }
}

// Draw character portrait circle with health info
function drawCharacterPanel(character, index) {
    const { position, color, name, currentHp, maxHp, currentEnergy, maxEnergy } = character;
    const { x, y } = position;
    
    // Character circle (existing)
    drawCircle(x, y, 50, color, '#fff');
    
    // Health bar above character
    const barWidth = 120;
    const barHeight = 16;
    const barX = x - barWidth/2;
    const barY = y - 80;
    
    drawHealthBar(barX, barY, barWidth, barHeight, currentHp, maxHp);
    
    // Energy bar below health bar
    const energyHeight = 8;
    const energyY = barY + barHeight + 4;
    
    drawEnergyBar(barX, energyY, barWidth, energyHeight, currentEnergy, maxEnergy);
    
    // Character name
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(name, x, y + 60);
    
    // Status effects area (placeholder)
    // will add stuff here later
}

// Draw entire character panel
function drawCharacterPanelUI() {
    // Semi-transparent background for the entire panel
    const panelY = 600;
    const panelHeight = 290;
    
    roundRect(ctx, 0, panelY, canvas.width, panelHeight, 0, 'rgba(0, 20, 40, 0.7)', 'rgba(255, 255, 255, 0.1)', 2);
    
    // Draw each character
    characters.forEach((character, index) => {
        drawCharacterPanel(character, index);
    });
}
/*
##### #     ##      ##### ###    # ###  ###  ### ##### ##    # ###        ##### /          ##### ##    
####  /#    #### / ######  /### /  /###/ ###/ #######  /### /  /###  /  ######  /        ######  /### / 
###  / ##    ###/ /#   /  / ###/  /  ###  ###/ /#   /  / ###/  /  ###/  /#   /  /        /#   /  / ###/  
##  /  ##    # # /    /  /   ##  /    ###  ##/     /  /   ##  /    ###      /  /        /    /  /   ##   
## /   ##    #  /    /  /       /      ##  ##     ## ##   ##  ##     ##     /  /             /  /         
##/    ##    # ##   /##/      ##       ## ##      ## ##   ##  ##     ##    ## ##            ## ##         
##     ##    # ##  /##        ##       ## ##      ## ##   ##  ##     ##    ## ##            ## ##         
##     ##    # ## /##         ##       ## ##      ## ##   ##  ##     ##    ## ##            ## ######     
##     ##    # ##/##          ##       ## ##      ## ##   ##  ##     ##    ## ##            ## #####      
##     ##    # ###            ##       ## ##      ## ##   ##  ##     ##    ## ##            ## ##         
#      ##    # ##             ##       ## ##      ## ##   ##  ##     ##    #  ##            #  ##         
       /     #                ##       #  /       #  /    #    /     ##       /                /          
   /##/      #            /##/##       /  /       /  /          /##/##    /##/           / /##/         / 
  /  ####    #           /  ####      /  /       /  /          /  ####   /  ############/ /  ##########/  
 /    ##     #          /    ##      /  /       /  /          /    ##   /     #########  /     ######     
 #            #         #            /  /       /  /          #         #                #                
  ##           ##        ##         ## /       ## /            ##        ##               ##               
*/

// Draw enemy health bar (different style from character bars)
function drawEnemyHealthBar(x, y, width, height, currentHp, maxHp, enemyName) {
    // Background with darker theme for enemies
    roundRect(ctx, x, y, width, height, 6, 'rgba(40, 0, 0, 0.8)', '#800000', 2);
    
    // Health fill
    const healthPercent = Math.max(0, currentHp / maxHp);
    const fillWidth = (width - 6) * healthPercent;
    
    if (fillWidth > 0 && currentHp > 0) {
        // Enemy health colors (red theme)
        let healthColor = '#ff4444';
        if (healthPercent < 0.25) healthColor = '#cc0000'; // Dark red for low health
        else if (healthPercent < 0.5) healthColor = '#ff6666'; // Medium red
        else healthColor = '#ff4444'; // Normal red
        
        roundRect(ctx, x + 3, y + 3, fillWidth, height - 6, 3, healthColor);
    }
    
    // Health text
    ctx.fillStyle = currentHp <= 0 ? '#666' : '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if (currentHp <= 0) {
        ctx.fillText('DEFEATED', x + width/2, y + height/2);
    } else {
        ctx.fillText(`${currentHp}/${maxHp}`, x + width/2, y + height/2);
    }
}

// Draw individual enemy with health bar
function drawEnemyPanel(enemy, index) {
    const { position, color, name, currentHp, maxHp } = enemy;
    const { x, y } = position;
    
    // Enemy circle (existing) - dim if defeated
    const enemyColor = currentHp <= 0 ? '#333' : color;
    const strokeColor = currentHp <= 0 ? '#666' : '#fff';
    drawCircle(x, y, 50, enemyColor, strokeColor);
    
    // Add defeated overlay
    if (currentHp <= 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.arc(x, y, 50, 0, Math.PI * 2);
        ctx.fill();
        
        // X mark for defeated enemies
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x - 20, y - 20);
        ctx.lineTo(x + 20, y + 20);
        ctx.moveTo(x + 20, y - 20);
        ctx.lineTo(x - 20, y + 20);
        ctx.stroke();
    }
    
    // Health bar above enemy
    const barWidth = 140;
    const barHeight = 18;
    const barX = x - barWidth/2;
    const barY = y - 85;
    
    drawEnemyHealthBar(barX, barY, barWidth, barHeight, currentHp, maxHp, name);
    
    // Enemy name above health bar
    ctx.fillStyle = currentHp <= 0 ? '#666' : '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(name, x, barY - 5);
    
    // Level or threat indicator (optional)
    if (currentHp > 0) {
        ctx.fillStyle = '#ffaa00';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`Lv.${15 + index * 2}`, x, y + 55);
    }
}

// Draw entire enemy panel
function drawEnemyPanelUI() {
    // Semi-transparent background for enemy area
    const panelY = 50;
    const panelHeight = 200;
    
    roundRect(ctx, 0, panelY, canvas.width, panelHeight, 0, 'rgba(40, 0, 0, 0.3)', 'rgba(255, 100, 100, 0.1)', 1);
    
    // Draw each enemy
    enemies.forEach((enemy, index) => {
        drawEnemyPanel(enemy, index);
    });
}

// Draw turn order portrait
function drawTurnPortrait(x, y, size, unit, isActive = false) {
    const radius = size / 2;
    
    // Active turn highlight
    if (isActive) {
        // Glowing border for active turn
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 15;
        drawCircle(x, y, radius + 5, 'rgba(255, 255, 0, 0.3)', '#ffff00');
        ctx.shadowBlur = 0;
    }
    
    // Unit portrait circle
    drawCircle(x, y, radius, unit.color, '#fff');
    
    // Health indicator (small bar below)
    const healthPercent = unit.hp / unit.maxHp;
    const barWidth = size * 0.8;
    const barHeight = 4;
    const barX = x - barWidth / 2;
    const barY = y + radius + 8;
    
    // Health bar background
    roundRect(ctx, barX, barY, barWidth, barHeight, 2, '#333', '#666', 1);
    
    // Health fill
    if (healthPercent > 0) {
        const fillWidth = barWidth * healthPercent;
        let healthColor = unit.type === 'character' ? '#4CAF50' : '#ff4444';
        if (healthPercent < 0.25) healthColor = '#f44336';
        else if (healthPercent < 0.5) healthColor = '#ff9800';
        
        roundRect(ctx, barX, barY, fillWidth, barHeight, 2, healthColor);
    }
    
    // Speed indicator
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(unit.speed.toString(), x, y + radius + 15);
}

// Draw the entire turn timeline
function drawTurnTimeline() {
    const timelineX = canvas.width - 120;
    const timelineY = 100;
    const timelineWidth = 100;
    const timelineHeight = 500;
    
    // Timeline background
    roundRect(ctx, timelineX, timelineY, timelineWidth, timelineHeight, 10, 
              'rgba(20, 20, 40, 0.8)', 'rgba(255, 255, 255, 0.2)', 2);
    
    // Timeline title
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Turn Order', timelineX + timelineWidth/2, timelineY + 10);
    
    // Calculate current turn order
    const currentQueue = calculateTurnOrder();
    
    // Draw turn portraits
    const portraitSize = 40;
    const spacing = 50;
    const startY = timelineY + 40;
    
    currentQueue.slice(0, 8).forEach((unit, index) => {
        const portraitX = timelineX + timelineWidth/2;
        const portraitY = startY + (index * spacing);
        
        // Check if this is the active turn
        const isActive = index === turnOrder.currentTurn;
        
        drawTurnPortrait(portraitX, portraitY, portraitSize, unit, isActive);
        
        // Turn number indicator
        ctx.fillStyle = isActive ? '#ffff00' : '#aaa';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${index + 1}`, portraitX - portraitSize/2 - 15, portraitY);
    });
    
    // Current turn indicator
    ctx.fillStyle = '#ffff00';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`Turn ${turnOrder.turnCounter}`, timelineX + timelineWidth/2, timelineY + timelineHeight - 10);
}
// Advance to next turn
function nextTurn() {
    turnOrder.currentTurn++;
    
    // start new round if all units have been gone through
    const aliveUnits = calculateTurnOrder().slice(0, 8);
    if (turnOrder.currentTurn >= aliveUnits.length) {
        turnOrder.currentTurn = 0;
        turnOrder.turnCounter++;
    }
    
    // Get current acting unit
    const currentUnit = aliveUnits[turnOrder.currentTurn];
    console.log(`Turn ${turnOrder.turnCounter}: ${currentUnit.name} (${currentUnit.type}) is acting`);
    
    return currentUnit;
}

// Initialize turn order
function initializeTurnOrder() {
    calculateTurnOrder();
    turnOrder.currentTurn = 0;
    turnOrder.turnCounter = 1;
}

document.addEventListener('DOMContentLoaded', () => {
    initializeTurnOrder();
});
