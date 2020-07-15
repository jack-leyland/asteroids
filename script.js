/** @type {HTMLCanvasElement} */

//Game constants (some will be rewritten as variables once customizability webpage is built in the future)
const FPS = 60; // Set framerate
const SHIP_SIZE = 18; //distance from origin to nose of ship in pixels, bottom indent is calculated in relation to this
const FRICTION = 0.7; //friction coefficiant of space where 0 = no friction, 1 = lots
const TURN_SPEED = 360; //turn speed in degrees per second
const SHIP_THRUST = 5; // ship accel in px per second per second
const INDENT = 0.65 // the lower this is the thinner the ship
const ROIDS_NUM = 5; //starting number of asteroids
const ROIDS_SIZE = 100; // max starting size in pixels
const ROIDS_SPD = 50; // max starting speed in pixels per second
const ROIDS_VERT = 10; // average number of vertices on each asteroid
const ROIDS_JAG = 0.4; // jaggedness of the asteriods (0 = none)
const SHIP_EXPLODE_DUR = .5; // duration of ship explosition in seconds
const SHIP_INV_DUR = 3; // duration of invulneratbility window after death
const SHIP_BLINK_DUR = 0.1; // duration of ship blink animation when invulnernerable
const LASER_MAX = 10; // Max number of lasers the canvas will render at once
const LASER_SPD = 500; // Speed of laser in pixels per second
const LASER_WIDTH = 2; // Width of laser beam in pixels
const LASER_LENGTH = 6; // Length of laser beam in pixels
const LASER_DIST = 0.3; // Maximum laser travel distance as fraction of canvas width 
const LASER_EXPLODE_DUR = 0.1; //duration of laser collision animation in seconds
const LASER_EXPLODE_DOTS = 15; // number of dots animated in the laser explosion
const LASER_DOTS_SPD = 400; // speed of explosion dot dissemination

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
}

//draw game canvas
var canv = document.getElementById('gameCanvas');
var ctx = canv.getContext('2d'); 

//gameplay global variables
var ship = newShip();

var roids = [];
createAsteroidBelt();

//Game polygons
var shipPoly = [
    { x: SHIP_SIZE, y: 0},
    { x: -SHIP_SIZE, y: -( INDENT * SHIP_SIZE)},
    { x: -(INDENT * SHIP_SIZE), y: 0,},
    { x: -SHIP_SIZE, y: (INDENT * SHIP_SIZE)},
]

var thrusterPoly = [
    {x: ((-SHIP_SIZE - (INDENT * SHIP_SIZE))/ 2 ), y: ( (INDENT * SHIP_SIZE) / 2)},
    {x: -SHIP_SIZE * 1.5, y: 0},
    {x: ((-SHIP_SIZE - (INDENT * SHIP_SIZE))/ 2 ), y: -( (INDENT * SHIP_SIZE) / 2) }
]

var laserPoly = [
    {x: 0, y: LASER_WIDTH / 2 },
    {x: LASER_LENGTH, y: LASER_WIDTH / 2 },
    {x: LASER_LENGTH, y: -LASER_WIDTH / 2 },
    {x: 0, y: -LASER_WIDTH / 2 },
]

//event handlers
document.addEventListener('keydown', keyDown);
document.addEventListener('keyup', keyUp);

//Game loop
setInterval(update, 1000 / FPS); 

//misc helper functions
function radConv(deg){
    return Math.PI * (deg / 180);
}

function rotx(x, y, angle){
    return (x * Math.cos(angle)) - (y * Math.sin(angle));
}

function roty(x, y, angle){
    return (x * Math.sin(angle)) + (y * Math.cos(angle));
}

function distBetweenPoints(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

//user interaction functions

function keyDown(/** @type {KeyboardEvent} */ ev){
    switch(ev.keyCode){
        case keyCodes['a']:
            ship.rot = radConv(-TURN_SPEED) / FPS
            break;
        case keyCodes['w']:
            ship.thrusting = true;
            break;
        case keyCodes['d']:
            ship.rot = radConv(TURN_SPEED) / FPS
            break;
        case keyCodes['shift']:
            createLaser();
            break;            
    }
}

function keyUp(/** @type {KeyboardEvent} */ ev){
    switch(ev.keyCode){
        case keyCodes['a']:
            ship.rot = 0;
            break;
        case keyCodes['w']:
            ship.thrusting = false;
            break;
        case keyCodes['d']:
            ship.rot = 0;
            break;
        case keyCodes['shift']:
            ship.canShoot = true;
            break;
    }
}

//gameplay object and array creation functions 

function newRoid(x, y, r) {
    var roid = {
        x: x, 
        y: y,
        xvel: Math.random() * ROIDS_SPD / FPS * (Math.random() < 0.5 ? 1 : -1),
        yvel: Math.random() * ROIDS_SPD / FPS * (Math.random() < 0.5 ? 1 : -1),
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

function newShip() {
    return {
    x: canv.width / 2,
    y: canv.height / 2,
    a: radConv(270), // 270 to spawn ship facing up
    rot: 0,
    explodeTime: 0,
    blinkTime: Math.ceil(SHIP_BLINK_DUR * FPS), // How long each blink is
    blinkNum: Math.ceil(SHIP_INV_DUR / SHIP_BLINK_DUR), // How many times it blinks within constant invulnerability time
    canShoot: true,
    lasers: [],
    thrusting: false,
    thrust: {
        x: 0,
        y: 0,
        }
    }
}

function newLaserExplosion(x , y) {
    var dots = [];

    for (var i = 0; i < LASER_EXPLODE_DOTS; i++) {
        dots.push({
            x: x, 
            y: y,
            r: 3, // hardcoded dot size
            xvel: Math.random() * LASER_DOTS_SPD / FPS * (Math.random() < 0.5 ? 1 : -1),
            yvel: Math.random() * LASER_DOTS_SPD / FPS * (Math.random() < 0.5 ? 1 : -1),
            a: Math.random() * Math.PI * 2,
            dist: 0,
        });
    }
}


function createAsteroidBelt() { //inital asteroid spawn
    var x, y;
    roids = [];

    for (var i = 0; i < ROIDS_NUM; i++) {
        do{    //controls spawn distance from ship
            x = Math.floor(Math.random() * canv.width);
            y = Math.floor(Math.random() * canv.height); 
        } while (distBetweenPoints(ship.x, ship.y, x, y) < ROIDS_SIZE * 2 + SHIP_SIZE);

        roids.push(newRoid(x, y, Math.ceil(ROIDS_SIZE / 2)));
    }
}

//drawing/animation functions

function drawShip(){
    var x, y;
    var i = 0;
    
    ctx.strokeStyle = 'white';
    ctx.lineWidth = SHIP_SIZE / 20;

    ctx.beginPath();
    
    x = rotx(shipPoly[i].x, shipPoly[i].y, ship.a) + ship.x;
    y = roty(shipPoly[i].x, shipPoly[i].y, ship.a) + ship.y;

    ctx.moveTo(x, y);

    for (i = 1; i < shipPoly.length; i++) {
        x = rotx(shipPoly[i].x, shipPoly[i].y, ship.a) + ship.x;
        y = roty(shipPoly[i].x, shipPoly[i].y, ship.a) + ship.y;
        ctx.lineTo(x, y);
      }
    
    ctx.closePath();
    ctx.stroke();
    
    if (SHOW_CENTER_DOT) {
        ctx.fillStyle = 'red';
        ctx.fillRect(ship.x - 1, ship.y - 1, 2, 2);
    }

    if (SHOW_BOUNDING) {
        ctx.strokeStyle = 'lime';
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, SHIP_SIZE, 0, Math.PI * 2, false);
        ctx.stroke();
    }

}

function drawThruster() {
    var x, y;
    var i = 0;
    
    ctx.strokeStyle = 'yellow';
    ctx.fillStyle = 'red';
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
      ctx.fill();
      ctx.stroke();
}

function drawRoid() { //draw asteroids based on coordinates in roids array

    var x, y, r, a, vert, offs; 

    for (i = 0; i < roids.length; i++) {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = SHIP_SIZE / 20;

        x = roids[i].x;
        y = roids[i].y;
        r = roids[i].r;
        a = roids[i].a;
        vert = roids[i].vert;
        offs = roids[i].offs;


        //draw path
        ctx.beginPath();
        ctx.moveTo(
            x + r * offs[0] * Math.cos(a),
            y + r * offs[0] * Math.sin(a)
        );

        //draw polygon
        for (j = 1; j < vert; j++) {
            ctx.lineTo( 
                x + r * offs[j] * Math.cos(a + j * Math.PI * 2 / vert),
                y + r * offs[j] * Math.sin(a + j * Math.PI * 2 / vert)  
            );
        }

        ctx.closePath();
        ctx.stroke();

        // draw collision detection bounding

        if (SHOW_BOUNDING) {
            ctx.strokeStyle = 'lime';
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2, false);
            ctx.stroke();
        }
    }
}

function drawLaser() {
    var x, y, i;

    for (i = 0; i < ship.lasers.length; i++) {
        if(ship.lasers[i].explodeTime == 0){
            var j = 0;

            ctx.fillStyle = "white";
            ctx.beginPath();

            x = rotx(laserPoly[j].x, laserPoly[j].y, ship.lasers[i].a) + ship.lasers[i].x;
            y = roty(laserPoly[j].x, laserPoly[j].y, ship.lasers[i].a) + ship.lasers[i].y;

            ctx.moveTo(x, y);

            for (j = 1; j < laserPoly.length; j++) {
                x = rotx(laserPoly[j].x, laserPoly[j].y, ship.lasers[i].a) + ship.lasers[i].x;
                y = roty(laserPoly[j].x, laserPoly[j].y, ship.lasers[i].a) + ship.lasers[i].y;

                ctx.lineTo(x, y);
            }

            ctx.closePath();
            ctx.fill();
        } else {

            newLaserExplosion(ship.lasers[i].x, ship.lasers[i].y);
        
        }
    }
}

function drawShipExplosion() {
    ctx.fillStyle = 'darkred';
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, SHIP_SIZE * 1.7, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, SHIP_SIZE * 1.4, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.fillStyle = 'orange';
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, SHIP_SIZE * 0.8, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, SHIP_SIZE * 0.2, 0, Math.PI * 2, false);
    ctx.fill();
}

 
function drawLaserExplosion() {//move and draw the dots only when explosion timer is running
     
    do{
        for (var k = 0; k < dots.length; k++) {
            dots[k].x += dots[k].xvel;
            dots[k].y += dots[k].yvel;
        }

        //draw the dots
        for (var j = 0; j < dots.length; j++) {
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(dots[j].x, dots[j].y, dots[j].r, dots[j].a, 0, false);
            ctx.fill();
        }

     } while (true);

}

//basic gameplay functions

function moveShip() {
    var blinkOn = ship.blinkNum % 2 == 0; 
    var exploding = ship.explodeTime > 0;

    //if not exploding handle movement, movement animations and collision detection
    if (!exploding){ // exploding var is true if there is a non-zero explode time
        if(blinkOn) { // draws ship and thruster only if the blink number is even. 
            drawShip();
            if (ship.thrusting) {
                drawThruster();
            }
        }
        
        //handle blinking
        if(ship.blinkNum > 0) { //blink num starts at constant value on init (may need to change this so not invulnarable on game start)

            //reduce blink time & Num
            ship.blinkTime--; //starts counting down blink duration once new ship is spawned
            
            if (ship.blinkTime == 0) { // once a single blink is over, resets the blink duration timer and increments blink num down
                ship.blinkTime = Math.ceil(SHIP_BLINK_DUR * FPS);
                ship.blinkNum--;
            }
            
        }
        //collision detection 
        if (ship.blinkNum == 0) { // if not invulnerable
            for (var i = 0; i < roids.length; i++) {
                if (distBetweenPoints(ship.x, ship.y, roids[i].x, roids[i].y) < SHIP_SIZE + roids[i].r) {
                    ship.explodeTime = Math.ceil(SHIP_EXPLODE_DUR * FPS); // set an explode time (default is 0) exploding var reads this
                    destroyRoid(i);
                    break;
                } 
            }

        }
        
        //setting thrusting values
        if(ship.thrusting){
            ship.thrust.x -= SHIP_THRUST * Math.cos(ship.a) / FPS;
            ship.thrust.y += SHIP_THRUST * Math.sin(ship.a) / FPS;

        } else{
            ship.thrust.x -= FRICTION * ship.thrust.x / FPS;
            ship.thrust.y -= FRICTION * ship.thrust.y / FPS;
        }
        
        //apply thrusting and rotation values
        ship.x -= ship.thrust.x;
        ship.y += ship.thrust.y;

        ship.a += ship.rot;
        
    } else { 
        
        ship.canShoot = false;

        drawShipExplosion();
        
        //explosion obeys ships momentum and friction
        ship.thrust.x -= FRICTION * ship.thrust.x / FPS;
        ship.thrust.y -= FRICTION * ship.thrust.y / FPS;
        ship.x -= ship.thrust.x;
        ship.y += ship.thrust.y;
        
        //explosion time countdown
        ship.explodeTime--; 
        
        if(ship.explodeTime == 0){
            ship = newShip();
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
        } else if (roids[i].y < 0 - roids[i].r) {
            roids[i].y = canv.height + roids[i].r;
        } else if (roids[i].y > canv.height) {
            roids[i].y = 0 - roids[i].r;
        }
    }
}


function createLaser() { // creates laser objects

    if (ship.canShoot && ship.lasers.length < LASER_MAX) {
        ship.lasers.push({ //shoot from nose
            x: rotx(shipPoly[0].x, shipPoly[0].y, ship.a) + ship.x,
            y: roty(shipPoly[0].x, shipPoly[0].y, ship.a) + ship.y,
            a: ship.a,
            xvel: LASER_SPD * Math.cos(ship.a) / FPS,
            yvel: LASER_SPD * Math.sin(ship.a) / FPS,
            dist: 0,
            explodeTime: 0,
        })
    }
    ship.canShoot = false;
}

function shootLaser() {

    drawLaser();

    for (var i = 0; i < ship.lasers.length; i++) {
        
        if(ship.lasers[i].dist > LASER_DIST * canv.width) {
            ship.lasers.splice(i, 1);
            continue;
        }


        
        // Handle explosion condition
        if (ship.lasers[i].explodeTime > 0) {
            ship.lasers[i].explodeTime--;

            //destroy laser once duration is up


        } else {
            //move the laser beam
            ship.lasers[i].x += ship.lasers[i].xvel;
            ship.lasers[i].y += ship.lasers[i].yvel;
            
            // increment distance traveled
            ship.lasers[i].dist += Math.sqrt(Math.pow(ship.lasers[i].xvel, 2) + Math.pow(ship.lasers[i].yvel, 2));
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
            if (ship.lasers[j].explodeTime == 0 && distBetweenPoints(ax, ay, lx, ly) < ar) { 
                destroyRoid(i);
                ship.lasers[j].explodeTime = Math.ceil(LASER_EXPLODE_DUR * FPS);
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
    } else if (r == Math.ceil(ROIDS_SIZE / 4)) {
        roids.push(newRoid(x, y, Math.ceil(ROIDS_SIZE / 8)));
        roids.push(newRoid(x, y, Math.ceil(ROIDS_SIZE / 8)));
    }

    roids.splice(index, 1);
}

function update(){

    // Draw game space
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canv.width, canv.height);

    // Move ship and handle all associated collision detection and thruster animations
    moveShip();

    // Handle all asteroid functionality of asteroids created on init (asteroid creation logic will change in the future)  
    handleRoids();

    // Draw and move lasers created on keyDown
    shootLaser();

    

} 
