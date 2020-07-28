/** @type {HTMLCanvasElement} */

//Game constants (some will be rewritten as variables once customizability webpage is built in the future)
const FPS = 60; // Set framerate
const SHIP_SIZE = 18; //distance from origin to nose of ship in pixels, bottom indent is calculated in relation to this
const FRICTION = 0.7; //friction coefficiant of space where 0 = no friction, 1 = lots
const TURN_SPEED = 360; //turn speed in degrees per second
const SHIP_THRUST = 5; // ship accel in px per second per second
const INDENT = 0.65; // the lower this is the thinner the ship
const ROIDS_NUM = 3; //starting number of asteroids
const ROIDS_SIZE = 100; // max starting size in pixels
const ROIDS_SPD = 50; // max starting speed in pixels per second
const ROIDS_VERT = 15; // average number of vertices on each asteroid
const ROIDS_JAG = 0.4; // jaggedness of the asteriods (0 = none)
const ROIDS_PTS_LGE = 20; //number of points for destruction of large asteroid
const ROIDS_PTS_MED = 50; //number of points for destruction of large asteroid
const ROIDS_PTS_SML = 100; //number of points for destruction of large asteroid
const SHIP_EXPLODE_DUR = 0.5; // duration of ship explosition in seconds
const SHIP_INV_DUR = 3; // duration of invulneratbility window after death
const SHIP_BLINK_DUR = 0.1; // duration of ship blink animation when invulnernerable
const LASER_MAX = 3; // Max number of lasers the canvas will render at once
const LASER_SPD = 450; // Speed of laser in pixels per second
const LASER_WIDTH = SHIP_SIZE / 20; // Width of laser beam in pixels
const LASER_LENGTH = 8; // Length of laser beam in pixels
const LASER_DIST = 0.45; // Maximum laser travel distance as fraction of canvas width
const LASER_EXPLODE_DUR = 0.35; //duration of laser collision animation in seconds
const EXPLODE_DOTS = 10; // number of dots animated in the explosions
const LASER_DOTS_SPD = 200; // speed of laser explosion dot dissemination
const SHIP_DOTS_SPD = 100; // speed of ship explosion dot dissemination
const TEXT_FADE_TIME = 2.5; //amount of time that the level display takes to fade
const TEXT_SIZE = 40; // Font height in pixels
const GAME_LIVES = 3; // number of lives
const TIME_TO_NEW_GAME = 4; // time in second after game over until new game initializes
const SAVE_KEY = "highscore"; // save key for high score local storage

//Dev settings
const SHOW_CENTER_DOT = false; //Show ship center dot
const SHOW_BOUNDING = false; //show or hide collision bounding

//Keycodes
var keyCodes = {
  w: 87,
  a: 65,
  s: 83,
  d: 68,
  up: 38,
  down: 40,
  left: 37,
  right: 39,
  space: 32,
  shift: 16,
};

//draw game canvas
var canv = document.getElementById("gameCanvas");
var ctx = canv.getContext("2d");

//set up game parameters
var level, roids, explosions, ship, text, textAlpha, lives, score, highScore;
newGame();

//Game polygons
var shipPoly = [
  { x: SHIP_SIZE, y: 0 },
  { x: -SHIP_SIZE, y: -(INDENT * SHIP_SIZE) },
  { x: -(INDENT * SHIP_SIZE), y: 0 },
  { x: -SHIP_SIZE, y: INDENT * SHIP_SIZE },
];

var thrusterPoly = [
  { x: (-SHIP_SIZE - INDENT * SHIP_SIZE) / 2, y: (INDENT * SHIP_SIZE) / 2 },
  { x: -SHIP_SIZE * 1.5, y: 0 },
  { x: (-SHIP_SIZE - INDENT * SHIP_SIZE) / 2, y: -((INDENT * SHIP_SIZE) / 2) },
];

var laserPoly = [
  { x: 0, y: LASER_WIDTH / 2 },
  { x: LASER_LENGTH, y: LASER_WIDTH / 2 },
  { x: LASER_LENGTH, y: -LASER_WIDTH / 2 },
  { x: 0, y: -LASER_WIDTH / 2 },
];

//event handlers
document.addEventListener("keydown", keyDown);
document.addEventListener("keyup", keyUp);

//Game loop
setInterval(update, 1000 / FPS);

//misc helper functions
function radConv(deg) {
  return Math.PI * (deg / 180);
}

function rotx(x, y, angle) {
  return x * Math.cos(angle) - y * Math.sin(angle);
}

function roty(x, y, angle) {
  return x * Math.sin(angle) + y * Math.cos(angle);
}

function distBetweenPoints(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

//user interaction function

function keyDown(/** @type {KeyboardEvent} */ ev) {
  if (ship.dead) {
    return;
  }

  switch (ev.keyCode) {
    case keyCodes["a"]:
      ship.rot = radConv(-TURN_SPEED) / FPS;
      break;
    case keyCodes["w"]:
      ship.thrusting = true;
      break;
    case keyCodes["d"]:
      ship.rot = radConv(TURN_SPEED) / FPS;
      break;
    case keyCodes["shift"]:
      createLaser();
      break;
  }
}

function keyUp(/** @type {KeyboardEvent} */ ev) {
  if (ship.dead) {
    return;
  }

  switch (ev.keyCode) {
    case keyCodes["a"]:
      ship.rot = 0;
      break;
    case keyCodes["w"]:
      ship.thrusting = false;
      break;
    case keyCodes["d"]:
      ship.rot = 0;
      break;
    case keyCodes["shift"]:
      ship.canShoot = true;
      break;
  }
}

//gameplay object and array creation functions

function newGame() {
  score = 0;
  level = 0;
  lives = GAME_LIVES;
  ship = newShip(canv.width / 2, canv.height / 2);
  explosions = [];

  //fetch high score from local storage
  var scoreStr = (highScore = localStorage.getItem("highscore"));
  if (scoreStr == null) {
    highScore = 0;
  } else {
    highScore = parseInt(scoreStr);
  }

  newLevel();
}

function newLevel() {
  text = "Level " + (level + 1);
  textAlpha = 1.0;
  createAsteroidBelt();
}

function gameOver() {
  ship.dead = true;
  text = "GAME OVER!";
  textAlpha = 1.0;
}

function newRoid(x, y, r) {
  var lvlMult = 1 + 0.1 * level;
  var roid = {
    x: x,
    y: y,
    xvel:
      ((Math.random() * ROIDS_SPD * lvlMult) / FPS) *
      (Math.random() < 0.5 ? 1 : -1),
    yvel:
      ((Math.random() * ROIDS_SPD * lvlMult) / FPS) *
      (Math.random() < 0.5 ? 1 : -1),
    r: r,
    a: Math.random() * Math.PI * 2,
    vert: Math.floor(Math.random() * (ROIDS_VERT + 1) + ROIDS_VERT / 2),
    offs: [],
  };

  //create vertex offset array (controls jaggedness of asteroids)
  for (var i = 0; i < roid.vert; i++) {
    roid.offs.push(Math.random() * ROIDS_JAG * 2 + 1 - ROIDS_JAG);
  }

  return roid;
}

function newShip(x, y) {
  return {
    x: x,
    y: y,
    a: radConv(270), // 270 to spawn ship facing up
    rot: 0,
    explodeTime: 0,
    blinkTime: Math.ceil(SHIP_BLINK_DUR * FPS), // How long each blink is
    blinkNum: Math.ceil(SHIP_INV_DUR / SHIP_BLINK_DUR), // How many times it blinks within constant invulnerability time
    canShoot: true,
    dead: false,
    lasers: [],
    thrusting: false,
    thrust: {
      x: 0,
      y: 0,
    },
  };
}

function newExplosion(x, y, type) {
  //Obviously this is not an efficent way to implement this but I'm trying to wrap this up quickly and I don't know enough JS yet
  var dots = []; //to figure out a better way
  if (type == "ship") {
    for (var i = 0; i < EXPLODE_DOTS; i++) {
      dots.push({
        ship: true,
        x: x,
        y: y,
        r: 2,
        xvel:
          ((Math.random() * SHIP_DOTS_SPD) / FPS) *
          (Math.random() < 0.5 ? 1 : -1),
        yvel:
          ((Math.random() * SHIP_DOTS_SPD) / FPS) *
          (Math.random() < 0.5 ? 1 : -1),
        a: Math.random() * Math.PI * 2,
        explodeTime: Math.ceil(SHIP_EXPLODE_DUR * FPS),
      });
    }
    return dots;
  } else if (type == "laser") {
    for (var i = 0; i < EXPLODE_DOTS; i++) {
      dots.push({
        x: x,
        y: y,
        r: 1, // hardcoded dot size
        xvel:
          ((Math.random() * LASER_DOTS_SPD) / FPS) *
          (Math.random() < 0.5 ? 1 : -1),
        yvel:
          ((Math.random() * LASER_DOTS_SPD) / FPS) *
          (Math.random() < 0.5 ? 1 : -1),
        a: Math.random() * Math.PI * 2,
        explodeTime: Math.ceil(LASER_EXPLODE_DUR * FPS),
      });
    }
    return dots;
  }
}

function createAsteroidBelt() {
  //inital asteroid spawn
  var x, y;
  roids = [];

  for (var i = 0; i < ROIDS_NUM + level; i++) {
    do {
      //controls spawn distance from ship
      x = Math.floor(Math.random() * canv.width);
      y = Math.floor(Math.random() * canv.height);
    } while (
      distBetweenPoints(ship.x, ship.y, x, y) <
      ROIDS_SIZE * 2 + SHIP_SIZE
    );

    roids.push(newRoid(x, y, Math.ceil(ROIDS_SIZE / 2)));
  }
}

//drawing/animation functions

function drawShip(xpos, ypos, a, color = "white") {
  var x, y;
  var i = 0;

  ctx.strokeStyle = color;
  ctx.lineWidth = SHIP_SIZE / 20;

  ctx.beginPath();

  x = rotx(shipPoly[i].x, shipPoly[i].y, a) + xpos;
  y = roty(shipPoly[i].x, shipPoly[i].y, a) + ypos;

  ctx.moveTo(x, y);

  for (i = 1; i < shipPoly.length; i++) {
    x = rotx(shipPoly[i].x, shipPoly[i].y, a) + xpos;
    y = roty(shipPoly[i].x, shipPoly[i].y, a) + ypos;
    ctx.lineTo(x, y);
  }

  ctx.closePath();
  ctx.stroke();

  if (SHOW_CENTER_DOT) {
    ctx.fillStyle = "red";
    ctx.fillRect(ship.x - 1, ship.y - 1, 2, 2);
  }

  if (SHOW_BOUNDING) {
    ctx.strokeStyle = "lime";
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, SHIP_SIZE, 0, Math.PI * 2, false);
    ctx.stroke();
  }
}

function drawThruster() {
  var x, y;
  var i = 0;

  ctx.strokeStyle = "white";
  //ctx.fillStyle = 'red'; leaving this here in case I ever want to use it again
  ctx.lineWidth = SHIP_SIZE / 20;

  ctx.beginPath();

  x = rotx(thrusterPoly[i].x, thrusterPoly[i].y, ship.a) + ship.x;
  y = roty(thrusterPoly[i].x, thrusterPoly[i].y, ship.a) + ship.y;

  ctx.moveTo(x, y);

  for (i = 1; i < thrusterPoly.length; i++) {
    x = rotx(thrusterPoly[i].x, thrusterPoly[i].y, ship.a) + ship.x;
    y = roty(thrusterPoly[i].x, thrusterPoly[i].y, ship.a) + ship.y;
    ctx.lineTo(x, y);
  }

  ctx.closePath();
  //ctx.fill();
  ctx.stroke();
}

function drawRoid() {
  //draw asteroids based on coordinates in roids array

  var x, y, r, a, vert, offs;

  for (i = 0; i < roids.length; i++) {
    ctx.strokeStyle = "white";
    ctx.lineWidth = SHIP_SIZE / 20;

    x = roids[i].x;
    y = roids[i].y;
    r = roids[i].r;
    a = roids[i].a;
    vert = roids[i].vert;
    offs = roids[i].offs;

    //draw path
    ctx.beginPath();
    ctx.moveTo(x + r * offs[0] * Math.cos(a), y + r * offs[0] * Math.sin(a));

    //draw polygon
    for (j = 1; j < vert; j++) {
      ctx.lineTo(
        x + r * offs[j] * Math.cos(a + (j * Math.PI * 2) / vert),
        y + r * offs[j] * Math.sin(a + (j * Math.PI * 2) / vert)
      );
    }

    ctx.closePath();
    ctx.stroke();

    // draw collision detection bounding

    if (SHOW_BOUNDING) {
      ctx.strokeStyle = "lime";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2, false);
      ctx.stroke();
    }
  }
}

function drawLaser() {
  var x, y, i;

  for (i = 0; i < ship.lasers.length; i++) {
    var j = 0;

    ctx.fillStyle = "white";
    ctx.beginPath();

    x =
      rotx(laserPoly[j].x, laserPoly[j].y, ship.lasers[i].a) + ship.lasers[i].x;
    y =
      roty(laserPoly[j].x, laserPoly[j].y, ship.lasers[i].a) + ship.lasers[i].y;

    ctx.moveTo(x, y);

    for (j = 1; j < laserPoly.length; j++) {
      x =
        rotx(laserPoly[j].x, laserPoly[j].y, ship.lasers[i].a) +
        ship.lasers[i].x;
      y =
        roty(laserPoly[j].x, laserPoly[j].y, ship.lasers[i].a) +
        ship.lasers[i].y;

      ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.fill();
  }
}

function gameDisplay() {
  //level text
  if (textAlpha >= 0) {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255, 255, 255, " + textAlpha + ")";
    ctx.font = "small-caps " + TEXT_SIZE + "px Arial";
    ctx.fillText(text, canv.width / 2, canv.height * 0.75);
    textAlpha -= 1.0 / TEXT_FADE_TIME / FPS;
  }

  if (textAlpha < 0) {
    //this fixes weird bug where textAlpha gets decremented to below zero. Probably some math thing from the previous if statement
    textAlpha = 0;
  }

  //Lives display
  var livesColor;
  for (var i = 0; i < lives; i++) {
    ship.explodeTime > 0 && i == lives - 1
      ? (livesColor = "red")
      : (livesColor = "white");
    drawShip(
      SHIP_SIZE * 2 + canv.width * (0 + i / 30),
      canv.height * 0.05,
      radConv(270),
      livesColor
    );
  }

  //draw score
  ctx.textAlign = "right";
  ctx.fillStyle = "white";
  ctx.font = TEXT_SIZE + "px Arial";
  ctx.fillText(score, canv.width * 0.975, canv.height * 0.07);

  //draw best score
  ctx.textAlign = "center";
  ctx.fillStyle = "white";
  ctx.font = TEXT_SIZE + "px Arial";
  ctx.fillText("Best " + highScore, canv.width / 2, canv.height * 0.07);
}

//basic gameplay functions

function moveShip() {
  var blinkOn = ship.blinkNum % 2 == 0;
  var exploding = ship.explodeTime > 0;

  //if not exploding handle movement, movement animations and collision detection
  if (!exploding) {
    // exploding var is true if there is a non-zero explode time
    if (blinkOn) {
      // draws ship and thruster only if the blink number is even.
      drawShip(ship.x, ship.y, ship.a);
      if (ship.thrusting) {
        drawThruster();
      }
    }

    //handle blinking
    if (ship.blinkNum > 0) {
      //blink num starts at constant value on init (may need to change this so not invulnarable on game start)

      //reduce blink time & Num
      ship.blinkTime--; //starts counting down blink duration once new ship is spawned

      if (ship.blinkTime == 0) {
        // once a single blink is over, resets the blink duration timer and increments blink num down
        ship.blinkTime = Math.ceil(SHIP_BLINK_DUR * FPS);
        ship.blinkNum--;
      }
    }
    //collision detection
    if (ship.blinkNum == 0) {
      // if not invulnerable
      for (var i = 0; i < roids.length; i++) {
        if (
          distBetweenPoints(ship.x, ship.y, roids[i].x, roids[i].y) <
          SHIP_SIZE + roids[i].r
        ) {
          ship.explodeTime = Math.ceil(SHIP_EXPLODE_DUR * FPS); // set an explode time (default is 0) exploding var reads this
          destroyRoid(i);
          break;
        }
      }
    }

    //setting thrusting values
    if (ship.thrusting) {
      ship.thrust.x -= (SHIP_THRUST * Math.cos(ship.a)) / FPS;
      ship.thrust.y += (SHIP_THRUST * Math.sin(ship.a)) / FPS;
    } else {
      ship.thrust.x -= (FRICTION * ship.thrust.x) / FPS;
      ship.thrust.y -= (FRICTION * ship.thrust.y) / FPS;
    }

    //apply thrusting and rotation values
    ship.x -= ship.thrust.x;
    ship.y += ship.thrust.y;
    ship.a += ship.rot;
  } else if (explosions.length > 0) {
    //Not sure if I really need this since a ship explosion happening at the same time as a laser one might be too rare

    for (var i = 0; i < explosions.length; i++) {
      if (explosions[i][0].ship) {
        ship.explodeTime--;

        if (ship.explodeTime == 0) {
          ship = newShip(canv.width / 2, canv.height / 2);
        }
        break;
      } else {
        ship.canShoot = false;
        explosions.push(newExplosion(ship.x, ship.y, "ship"));
        break;
      }
    }
  } else {
    ship.canShoot = false;
    explosions.push(newExplosion(ship.x, ship.y, "ship"));

    //explosion time countdown
    ship.explodeTime--;

    if (ship.explodeTime == 0) {
      ship = newShip(canv.width / 2, canv.height / 2);
    }
  }

  //handle screen edge (left outside of explsion condition so that explosions behave the same as ship)

  if (ship.x < 0 - SHIP_SIZE) {
    ship.x = canv.width + SHIP_SIZE;
  } else if (ship.y < 0 - SHIP_SIZE) {
    ship.y = canv.height + SHIP_SIZE;
  } else if (ship.x > canv.width + SHIP_SIZE) {
    ship.x = 0 - SHIP_SIZE;
  } else if (ship.y > canv.height + SHIP_SIZE) {
    ship.y = 0 - SHIP_SIZE;
  }
}

function handleRoids() {
  drawRoid();

  // move asteroids and handle edges
  for (var i = 0; i < roids.length; i++) {
    roids[i].x += roids[i].xvel;
    roids[i].y += roids[i].yvel;

    if (roids[i].x < 0 - roids[i].r) {
      roids[i].x = canv.width + roids[i].r;
    } else if (roids[i].x > canv.width + roids[i].r) {
      roids[i].x = 0 - roids[i].r;
    }
    if (roids[i].y < 0 - roids[i].r) {
      roids[i].y = canv.height + roids[i].r;
    } else if (roids[i].y > canv.height + roids[i].r) {
      roids[i].y = 0 - roids[i].r;
    }
  }
}

function createLaser() {
  // creates laser objects

  if (ship.canShoot && ship.lasers.length < LASER_MAX) {
    ship.lasers.push({
      //shoot from nose
      x: rotx(shipPoly[0].x, shipPoly[0].y, ship.a) + ship.x,
      y: roty(shipPoly[0].x, shipPoly[0].y, ship.a) + ship.y,
      a: ship.a,
      xvel: (LASER_SPD * Math.cos(ship.a)) / FPS,
      yvel: (LASER_SPD * Math.sin(ship.a)) / FPS,
      dist: 0,
    });
  }
  ship.canShoot = false;
}

function handleLaser() {
  for (var i = 0; i < ship.lasers.length; i++) {
    drawLaser();

    //move the laser beam
    ship.lasers[i].x += ship.lasers[i].xvel;
    ship.lasers[i].y += ship.lasers[i].yvel;

    // increment distance traveled
    ship.lasers[i].dist += Math.sqrt(
      Math.pow(ship.lasers[i].xvel, 2) + Math.pow(ship.lasers[i].yvel, 2)
    );

    if (ship.lasers[i].dist > LASER_DIST * canv.width) {
      ship.lasers.splice(i, 1);
      continue;
    }

    // Handle edge of screen

    if (ship.lasers[i].x < 0) {
      ship.lasers[i].x = canv.width;
    } else if (ship.lasers[i].x > canv.width) {
      ship.lasers[i].x = 0;
    } else if (ship.lasers[i].y < 0) {
      ship.lasers[i].y = canv.height;
    } else if (ship.lasers[i].y > canv.height) {
      ship.lasers[i].y = 0;
    }
  }

  // Collision detection with asteroids
  var ax, ay, ar, lx, ly;
  for (var i = roids.length - 1; i >= 0; i--) {
    ax = roids[i].x;
    ay = roids[i].y;
    ar = roids[i].r;

    for (var j = ship.lasers.length - 1; j >= 0; j--) {
      lx = ship.lasers[j].x;
      ly = ship.lasers[j].y;

      //detect hit
      if (distBetweenPoints(ax, ay, lx, ly) < ar) {
        destroyRoid(i);
        explosions.push(
          newExplosion(ship.lasers[j].x, ship.lasers[j].y, "laser")
        );
        ship.lasers.splice(j, 1);
        break;
      }
    }
  }
}

function handleExplosions() {
  //handling game over condition in here since it's the easiest

  for (var i = 0; i < explosions.length; i++) {
    for (var j = 0; j < explosions[i].length; j++) {
      if (explosions[i][j].explodeTime > 0) {
        //move
        explosions[i][j].x += explosions[i][j].xvel;
        explosions[i][j].y += explosions[i][j].yvel;
        explosions[i][j].explodeTime--;

        //draw
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(
          explosions[i][j].x,
          explosions[i][j].y,
          explosions[i][j].r,
          0,
          Math.PI * 2,
          false
        );
        ctx.fill();
      } else {
        if (explosions[i][0].ship) {
          //if this is a ship explosion
          lives--;
        }
        explosions.splice(i, 1);
        if (lives == 0) {
          gameOver();
        }
        break;
      }
    }
  }
}

function destroyRoid(index) {
  var x = roids[index].x;
  var y = roids[index].y;
  var r = roids[index].r;

  if (r == Math.ceil(ROIDS_SIZE / 2)) {
    roids.push(newRoid(x, y, Math.ceil(ROIDS_SIZE / 4)));
    roids.push(newRoid(x, y, Math.ceil(ROIDS_SIZE / 4)));
    score += ROIDS_PTS_LGE;
  } else if (r == Math.ceil(ROIDS_SIZE / 4)) {
    roids.push(newRoid(x, y, Math.ceil(ROIDS_SIZE / 8)));
    roids.push(newRoid(x, y, Math.ceil(ROIDS_SIZE / 8)));
    score += ROIDS_PTS_MED;
  } else {
    score += ROIDS_PTS_SML;
  }

  if (score > highScore) {
    highScore = score;
    localStorage.setItem(SAVE_KEY, highScore);
  }

  roids.splice(index, 1);

  if (roids.length == 0) {
    level++;
    newLevel();
  }
}

function update() {
  // Draw game space
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canv.width, canv.height);

  //restart game after gameover
  if (ship.dead && textAlpha == 0) {
    newGame();
    console.log("new triggeres");
  }

  //Draw all game display stuff (lives, level, scores etc..)
  gameDisplay();

  // Move ship and handle all associated collision detection and thruster animations
  if (!ship.dead) {
    moveShip();
  }
  // Handle all asteroid functionality of asteroids created on init (asteroid creation logic will change in the future)
  handleRoids();

  // Draw and move lasers created on keyDown. Pushes laser explosion arrays on contact with asteroid.
  handleLaser();

  //Draw and move explosions
  handleExplosions();
}
