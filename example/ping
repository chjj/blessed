#!/usr/bin/env node

/**
 * ping
 * https://github.com/chjj/blessed
 * Copyright (c) 2013, Christopher Jeffrey (MIT License)
 * Online (ping)pong in your terminal.
 */

// Example Usage:
// Server: $ ./example/ping 3000
// Client: $ ./example/ping 127.0.0.1 3000
// Demo: $ ./example/ping

process.title = 'ping';

if (/^(-h|--help|-\?)$/.test(process.argv[2])) {
  console.log('node-ping');
  console.log('Example Usage:');
  console.log('Server: $ node-ping 3000');
  console.log('Client: $ node-ping 127.0.0.1 3000');
  console.log('Demo: $ node-ping');
  return process.exit(0);
}

var blessed = require('blessed')
  , nssocket;

try {
  nssocket = require('nssocket');
} catch (e) {
  ;
}

var server
  , socket;

/**
 * Screen Layout
 */

var screen = blessed.screen();

var table = blessed.box({
  left: 0,
  top: 0,
  width: screen.width,
  height: screen.height
});

var ball = blessed.box({
  width: 1,
  height: 1,
  bg: 'white',
  top: 0,
  left: 0
});

var lpaddle = blessed.box({
  width: 1,
  height: 3,
  bg: 'yellow',
  top: 0,
  left: 0
});

var rpaddle = blessed.box({
  width: 1,
  height: 3,
  bg: 'yellow',
  top: 0,
  right: 0
});

var score = blessed.box({
  top: 0,
  left: 4,
  height: 3,
  width: 'shrink',
  border: {
    type: 'line'
  },
  //align: 'center',
  style: {
    bold: true
  },
  tags: true
});

score.lwins = 0;
score.rwins = 0;

var net = blessed.box({
  width: 1,
  height: '100%',
  bg: 'yellow',
  top: 0,
  left: 'center'
});

var message = blessed.box({
  width: '50%',
  height: 3,
  border: {
    type: 'line'
  },
  top: 'center',
  left: 'center'
});

var text = blessed.box({
  top: 'center',
  left: 1,
  right: 1,
  height: 1,
  align: 'center',
  content: 'Waiting for players to connect...'
});

message.append(text);

screen.append(table);

table.append(score);
table.append(lpaddle);
table.append(rpaddle);
table.append(net);
table.append(ball);
table.append(message);

screen.on('resize', function() {
  table.width = screen.width;
  table.height = screen.height;
  [ball, lpaddle, rpaddle].forEach(function(el) {
    if (el.rbottom < 0) el.rtop = table.height - 1 - el.height;
    if (el.rright < 0) el.rleft = table.width - 1;
  });
  screen.render();
  sync();
});

/**
 * Options
 */

ball.speed = 2;
ball.unpredictable = true;
lpaddle.speed = 2;
rpaddle.speed = 2;

/**
 * Game
 */

function sync() {
  if (!socket) return;
  socket.send(['update'], {
    table: { width: table.width, height: table.height },
    lpaddle: { rleft: lpaddle.rleft, rtop: lpaddle.rtop, speed: lpaddle.speed },
    rpaddle: { rleft: rpaddle.rleft, rtop: rpaddle.rtop, speed: rpaddle.speed },
    score: { lwins: score.lwins, rwins: score.rwins }
  });
}

function reset() {
  text.setContent('Waiting for players to connect...');
  message.hide();
  ball.moving = true;
  ball.direction = 'right';
  ball.angle = 'down';
  ball.rtop = 1;
  ball.rleft = 1;
  if ((score.lwins + score.rwins) % 2 !== 0) {
    ball.direction = 'left';
    ball.rleft = table.width - 1;
  }
  lpaddle.rtop = 0;
  rpaddle.rtop = 0;

  score.setContent('{green-fg}Score:{/} ' + score.lwins + ' | ' + score.rwins);

  rpaddle.movable = true;

  screen.render();
  if (server && socket) {
    socket.send(['reset']);
  }
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function startGame() {
  reset();

  if (startGame._bound) return;
  startGame._bound = true;

  screen.on('keypress', function(ch, key) {
    if (!ball.moving) return;
    if (key.name === 'up' || key.name === 'k') {
      if (socket) socket.send(['up']);
      if (lpaddle.rtop > 0) lpaddle.rtop -= lpaddle.speed;
      if (!socket) if (rpaddle.rtop > 0) rpaddle.rtop -= rpaddle.speed;
      if (lpaddle.rtop < 0) lpaddle.rtop = 0;
      if (rpaddle.rtop < 0) rpaddle.rtop = 0;
      screen.render();
    } else if (key.name === 'down' || key.name === 'j') {
      if (socket) socket.send(['down']);
      if (lpaddle.rbottom > 0) lpaddle.rtop += lpaddle.speed;
      if (!socket) if (rpaddle.rbottom > 0) rpaddle.rtop += rpaddle.speed;
      if (lpaddle.rbottom < 0) lpaddle.rtop = table.height - lpaddle.height - 1;
      if (rpaddle.rbottom < 0) rpaddle.rtop = table.height - rpaddle.height - 1;
      screen.render();
    }
  });

  setInterval(function() {
    if (!ball.moving) return;
    if (ball.direction === 'right') {
      if (ball.rright > 1) {
        ball.rleft += ball.speed;
      } else {
        if (ball.rtop >= rpaddle.rtop && ball.rtop <= rpaddle.rtop + rpaddle.height) {
          ball.direction = 'left';
          ball.rleft -= ball.speed;

          ball.rleft -= rand(0, 3);
          if (ball.angle === 'down') ball.rtop += rand(0, 3);
          else if (ball.angle === 'up') ball.rtop -= rand(0, 3);
        } else {
          // Right loses
          score.lwins++;
          ball.rleft = table.width - 1;
          if (socket) socket.send(['lose']);
          ball.moving = false;
          text.setContent('Right player loses!');
          message.show();
          setTimeout(reset, 3000);
          screen.render();
          return;
        }
      }
      if (ball.rright < 1) ball.rleft = table.width - 2;
    } else if (ball.direction === 'left') {
      if (ball.rleft > 1) {
        ball.rleft -= ball.speed;
      } else {
        if (ball.rtop >= lpaddle.rtop && ball.rtop <= lpaddle.rtop + lpaddle.height) {
          ball.direction = 'right';
          ball.rleft += ball.speed;

          ball.rleft += rand(0, 3);
          if (ball.angle === 'down') ball.rtop += rand(0, 3);
          else if (ball.angle === 'up') ball.rtop -= rand(0, 3);
        } else {
          // Left loses
          score.rwins++;
          ball.rleft = 0;
          if (socket) socket.send(['win']);
          ball.moving = false;
          text.setContent('Left player loses!');
          message.show();
          setTimeout(reset, 3000);
          screen.render();
          return;
        }
      }
      if (ball.rleft < 1) ball.rleft = 1;
    }
    if (ball.angle === 'down') {
      if (ball.rbottom > 0) {
        ball.rtop++;
        if (ball.unpredictable) ball.rtop += rand(0, 3);
      } else {
        ball.angle = 'up';
        ball.rtop--;
      }
    } else if (ball.angle === 'up') {
      if (ball.rtop > 0) {
        ball.rtop--;
        if (ball.unpredictable) ball.rtop -= rand(0, 3);
      } else {
        ball.angle = 'down';
        ball.rtop++;
      }
    }
    if (ball.rtop < 0) ball.rtop = 0;
    if (ball.rbottom < 0) ball.rtop = table.height - 1;
    if (socket) socket.send(['ball'], { rleft: ball.rleft, rtop: ball.rtop });
    screen.render();
  }, 100);
}

function startServer() {
  server = nssocket.createServer({}, function(socket_) {
    socket = socket_;

    sync();

    socket.data(['up'], function() {
      if (!ball.moving) return;
      if (rpaddle.rtop > 0) rpaddle.rtop -= rpaddle.speed;
      screen.render();
    });

    socket.data(['down'], function() {
      if (!ball.moving) return;
      if (rpaddle.rtop < table.height - 1) rpaddle.rtop += rpaddle.speed;
      screen.render();
    });

    socket.on('error', function() {
      socket = null;
      reset();
      ball.moving = false;
      message.show();
      screen.render();
    });

    startGame();
  });

  server.listen(+process.argv[2]);
}

function startClient() {
  var socket = new nssocket.NsSocket({
    reconnect: true,
    maxRetries: Infinity,
    retryInterval: 5000
  });

  socket.connect(+process.argv[3], process.argv[2]);

  screen.on('keypress', function(ch, key) {
    if (!rpaddle.movable) return;
    if (key.name === 'up' || key.name === 'k') {
      socket.send(['up']);
      if (rpaddle.rtop > 0) rpaddle.rtop -= rpaddle.speed;
      if (rpaddle.rtop < 0) rpaddle.rtop = 0;
      screen.render();
    } else if (key.name === 'down' || key.name === 'j') {
      socket.send(['down']);
      if (rpaddle.rbottom > 0) rpaddle.rtop += rpaddle.speed;
      if (rpaddle.rbottom < 0) rpaddle.rtop = table.height - rpaddle.height - 1;
      screen.render();
    }
  });

  socket.data(['up'], function() {
    if (lpaddle.rtop > 0) lpaddle.rtop -= lpaddle.speed;
    screen.render();
  });

  socket.data(['down'], function() {
    if (lpaddle.rtop < table.height - 1) lpaddle.rtop += lpaddle.speed;
    screen.render();
  });

  socket.data(['ball'], function(data) {
    ball.rleft = data.rleft;
    ball.rtop = data.rtop;
    screen.render();
  });

  socket.data(['update'], function(data) {
    if (data.lpaddle) {
      lpaddle.rleft = data.lpaddle.rleft;
      lpaddle.rtop = data.lpaddle.rtop;
      lpaddle.speed = data.lpaddle.speed;
    }

    if (data.rpaddle) {
      rpaddle.rleft = data.rpaddle.rleft;
      rpaddle.rtop = data.rpaddle.rtop;
      rpaddle.speed = data.rpaddle.speed;
    }

    if (data.ball) {
      ball.moving = data.ball.moving;
      ball.rleft = data.ball.rleft;
      ball.rtop = data.ball.rtop;
    }

    if (data.table) {
      table.height = data.table.height;
      table.width = data.table.width;
    }

    if (data.score) {
      score.lwins = data.score.lwins;
      score.rwins = data.score.rwins;
    }

    screen.render();
  });

  socket.data(['win'], function() {
    rpaddle.movable = false;
    score.rwins++;
    text.setContent('Left player loses!');
    message.show();
    screen.render();
  });

  socket.data(['lose'], function() {
    rpaddle.movable = false;
    score.lwins++;
    text.setContent('Right player loses!');
    message.show();
    screen.render();
  });

  socket.data(['reset'], reset);

  reset();
}

/**
 * Main
 */

function main() {
  screen.on('keypress', function(ch, key) {
    if (key.name === 'q' || key.name === 'escape') {
      return process.exit(0);
    }
  });

  screen.render();

  // Demo Mode / Single Player
  if (!nssocket || !process.argv[2]) return startGame();

  // Server Mode
  if (!process.argv[3]) return startServer();

  // Client Mode
  if (process.argv[2] && process.argv[3]) return startClient();
}

/**
 * Execute
 */

main();
