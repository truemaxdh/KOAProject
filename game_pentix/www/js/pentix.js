var COLS = 15, ROWS = 20;
var BLOCK_WH = 5;
var board = [];
var score;

var lastTick;;
var objInterval;
var move_wait_limit = 1000;
var move_wait_cnt;
var current; // current moving shape
var currentX, currentY; // position of current shape
var cleardLines;
var paused = false;
var undo_flg = false;

// var shapes = [
//     [ 0, 0, 0, 0,
//       1, 1, 1, 1 ],
//     [ 0, 0, 0, 0,
//       1, 1, 1, 0,
//       1 ],
//     [ 0, 0, 0, 0,
//       1, 1, 1, 0,
//       0, 0, 1 ],
//     [ 0, 0, 0, 0,
//       1, 1, 0, 0,
//       1, 1 ],
//     [ 0, 0, 0, 0,
//       1, 1, 0, 0,
//       0, 1, 1 ],
//     [ 0, 0, 0, 0,
//       0, 1, 1, 0,
//       1, 1 ],
//     [ 0, 0, 0, 0,
//       0, 1, 0, 0,
//       1, 1, 1 ]
// ];

var shapes = [
    // 5
    [ 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0,
      1, 1, 1, 1, 1 ],
    // 4
    [ 0, 0, 0, 0, 0,
      1, 1, 1, 1, 0,
      1 ],
    [ 0, 0, 0, 0, 0,
      1, 1, 1, 1, 0,
      0, 1 ],
    [ 0, 0, 0, 0, 0,
      1, 1, 1, 1, 0,
      0, 0, 1 ],
    [ 0, 0, 0, 0, 0,
      1, 1, 1, 1, 0,
      0, 0, 0, 1 ],
    // 3
    [ 0, 0, 0, 0, 0,
      0, 1, 1, 1, 0,
      1, 1 ],
    [ 0, 0, 0, 0, 0,
      0, 1, 1, 1, 0,
      0, 1, 1 ],
    [ 0, 0, 0, 0, 0,
      0, 1, 1, 1, 0,
      0, 0, 1, 1 ],
    [ 0, 0, 0, 0, 0,
      0, 1, 1, 1, 0,
      0, 0, 0, 1, 1 ],
    [ 0, 0, 0, 0, 0,
      0, 1, 1, 1, 0,
      0, 1, 0, 0, 0,
      0, 1 ],
    [ 0, 0, 0, 0, 0,
      0, 1, 1, 1, 0,
      0, 0, 1, 0, 0,
      0, 0, 1 ],
    [ 0, 0, 0, 0, 0,
      0, 1, 1, 1, 0,
      0, 0, 0, 1, 0, 
      0, 0, 0, 1 ],
    // 2
    [ 0, 0, 0, 0, 0,
      0, 1, 1, 0, 0,
      0, 1, 0, 0, 0,
      0, 1, 1 ],
    [ 0, 0, 0, 0, 0,
      0, 0, 1, 1, 0,
      0, 1, 1, 0, 0,
      0, 1 ],
    [ 0, 0, 0, 0, 0,
      0, 0, 1, 1, 0,
      0, 1, 1, 0, 0,
      0, 0, 1 ],
    [ 0, 0, 0, 0, 0,
      0, 1, 1, 0, 0,
      0, 0, 1, 1, 0,
      0, 0, 1 ],
    [ 0, 0, 0, 0, 0,
      0, 1, 1, 0, 0,
      0, 0, 1, 0, 0,
      0, 0, 1, 1 ],
    [ 0, 0, 0, 0, 0,
      0, 0, 1, 1, 0,
      0, 0, 1, 0, 0,
      0, 1, 1 ],
    [ 0, 0, 0, 0, 0,
      0, 0, 1, 0, 0,
      0, 1, 1, 1, 0,
      0, 0, 1 ]
];

var game_hist = [];

// creates a new 5x5 shape in global variable 'current'
// 5x5 so as to cover the size when the shape is rotated
function newShape() {
    var id = Math.floor( Math.random() * shapes.length );
    var shape = shapes[ id ]; // maintain id for color filling

    current = [];
    for ( var y = 0; y < BLOCK_WH; ++y ) {
        current[ y ] = [];
        for ( var x = 0; x < BLOCK_WH; ++x ) {
            var i = BLOCK_WH * y + x;
            if ( typeof shape[ i ] != 'undefined' && shape[ i ] ) {
                current[ y ][ x ] = id + 1;
            }
            else {
                current[ y ][ x ] = 0;
            }
        }
    }
    // position where the shape will evolve
    currentX = 5;
    currentY = -1;
    
    var copy_board = [];
    for (var i = 0; i < board.length; i++) {
        copy_board.push(board[i].slice());
    }
    game_hist.push({"current" : current.slice(), "board" : copy_board, "score" : score, "currentX" : currentX, "currentY" : currentY});
    //console.log(game_hist);
}

function undo() {
    if (currentX == 5 && currentY == -1 && game_hist.length > 1) {
        game_hist.pop();
    } 
    if (game_hist.length > 0) {
        var last_snapshot = game_hist[game_hist.length - 1];
        current = last_snapshot.current;
        board = last_snapshot.board;
        score = last_snapshot.score;
        currentX = last_snapshot.currentX;
        currentY = last_snapshot.currentY;
        render_score();
    }
}

// clears the board
function init() {
    for ( var y = 0; y < ROWS; ++y ) {
        board[ y ] = [];
        for ( var x = 0; x < COLS; ++x ) {
            board[ y ][ x ] = 0;
        }
    }
    game_hist = [];
}

// keep the element moving down, creating new shapes and clearing lines
function tick(curTick) {
    if (undo_flg) {
        undo();
        undo_flg = false;
    } else {
        if (!keyPressed) {
            procTouchEvent();
        } 
            
        procKeyEvent();
        render_board();
        render_current();
        render_boarder();
        
        keyPressed = false;

        var diffTick = curTick - lastTick;
        if (diffTick < 1000)
            move_wait_cnt += diffTick;
        lastTick = curTick; 
        if (move_wait_cnt > move_wait_limit) {
            move_wait_cnt -= move_wait_limit;

            if ( !valid( 0, 1 ) ) {
                if (currentY < 0) {
                    gameOver();
                } else {
                    freeze();
                    clearLines(ROWS, 0);
                }
                return false;
            }
            // if the element settled
            else {
                ++currentY;
            }
        }
    }
    if (!paused) {
        requestAnimationFrame(tick);
    }
}

function gameOver() {
    //clearInterval(objInterval);
    pauseBGM();
    removeEvt();
    render_gameover();
    if (isApp && glGameSvc.loginStatus) {
      try {  
        Android.submitScore(leaderboardId, score);
      } catch(e) {
        Android.showToast("submitScoe failed.");
      }
      
    }
    OpenUserResult();    
    document.getElementById('user_score').innerHTML = score;
}

// stop shape at its position and fix it to board
function freeze() {
    for ( var y = 0; y < BLOCK_WH; ++y ) {
        for ( var x = 0; x < BLOCK_WH; ++x ) {
            if ( current[ y ][ x ] ) {
                board[ y + currentY ][ x + currentX ] = current[ y ][ x ];
            }
        }
    }
}

// returns rotates the rotated shape 'current' perpendicularly anticlockwise
function rotate( current ) {
    var newCurrent = [];
    for ( var y = 0; y < BLOCK_WH; ++y ) {
        newCurrent[ y ] = [];
        for ( var x = 0; x < BLOCK_WH; ++x ) {
            newCurrent[ y ][ x ] = current[ BLOCK_WH - 1 - x ][ y ];
        }
    }

    return newCurrent;
}

// check if any lines are filled and clear them
function clearLines(y, combo) {
    //for ( var y = ROWS - 1; y >= 0; --y ) {
    if (--y >= 0) {
        var rowFilled = true;
        for ( var x = 0; x < COLS; ++x ) {
            if ( board[ y ][ x ] == 0 ) {
                rowFilled = false;
                break;
            } 
        }
 
        if ( rowFilled ) {
            
            cleardLines++;
            if (isApp) {
                chkAndUnlockAchievement(cleardLines);
            }            
            score += ++combo * 10;
            render_score();
            
            playSound();
            
            for ( var yy = y; yy > 0; --yy ) {
                for ( var x = 0; x < COLS; ++x ) {
                    board[ yy ][ x ] = board[ yy - 1 ][ x ];
                }
            }
            ++y;
            render_board();
            render_boarder(); 
            setTimeout(clearLines, 500, y, combo);
        } else {
            clearLines(y, combo);
        }
    } else {
        newShape();
        requestAnimationFrame(tick);
    }
}

var rotBlTmr = 0;
function procKeyEvent() {
    switch ( keyCode ) {
        case 'left':
            if ( valid( -1 ) ) {
                --currentX;
            }
            break;
        case 'right':
            if ( valid( 1 ) ) {
                ++currentX;
            }
            break;
        case 'down':
            if ( valid( 0, 1 ) ) {
                ++currentY;
            }
            break;
        case 'rotate':
            if (rotBlTmr--==0) {
                var rotated = rotate( current );
                if ( valid( 0, 0, rotated ) ) {
                    current = rotated;
                }
                rotBlTmr = 1;
            }
            break;
    }
    //render_board();
    //render_current();
    //render_boarder();
}

function procTouchEvent() {
    keyCode = '';
    if (user_pressing) {
        for (var i = 0; i < 10; i++) {
            var dx = user_x - user_x_ori;
            var dy = user_y - user_y_ori;

            if (Math.abs(dx) < (BLOCK_W / 2) && Math.abs(dy) < (BLOCK_H / 2)) {
                return;
                //break;                
            }

            if (i > 0)
                procKeyEvent();
            
            keyCode = '';            
            do_rotate = false;
            
            if (dy > (BLOCK_H - 1)) {
                keyCode = 'down';
                user_y_ori = user_y_ori + BLOCK_H;
                user_x_ori = user_x;
            } else if (dx > (BLOCK_W - 1)) {
                keyCode = 'right';
                user_x_ori = user_x_ori + BLOCK_W;
                user_y_ori = user_y;
            } else if (dx < -(BLOCK_W - 1)) {
                keyCode = 'left';
                user_x_ori = user_x_ori - BLOCK_W;
                user_y_ori = user_y;
            } else
                return;
                //break;            
        }
    } else {
        if (do_rotate) {
            rotBlTmr = 0;
            keyCode = 'rotate';
            do_rotate = false;
        }
    }
}

// checks if the resulting position of current shape will be feasible
function valid( offsetX, offsetY, newCurrent ) {
    offsetX = offsetX || 0;
    offsetY = offsetY || 0;
    offsetX = currentX + offsetX;
    offsetY = currentY + offsetY;
    newCurrent = newCurrent || current;



    // for ( var y = 0; y < 4; ++y ) {
    for ( var y = 0; y < BLOCK_WH; ++y ) {
        // for ( var x = 0; x < 4; ++x ) {
        for ( var x = 0; x < BLOCK_WH; ++x ) {
            if ( newCurrent[ y ][ x ] ) {
                if ( typeof board[ y + offsetY ] == 'undefined'
                  || typeof board[ y + offsetY ][ x + offsetX ] == 'undefined'
                  || board[ y + offsetY ][ x + offsetX ]
                  || x + offsetX < 0
                  || y + offsetY >= ROWS
                  || x + offsetX >= COLS ) {
                    // if (offsetY == 1) lose = true; // lose if the current shape at the top row when checked
                    // if (offsetY < 1) lose = true; // lose if the current shape at the top row when checked
                    return false;
                }
            }
        }
    }
    return true;
}

function newGame() {
    init();
    score = 0;
    cleardLines = 0;
    newShape();

    document.getElementById( 'score_num' ).innerHTML = score;
    move_wait_cnt = 0;
    playBGM();
    requestAnimationFrame(tick);
}
