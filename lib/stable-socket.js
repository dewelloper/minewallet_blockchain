'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events');
var Helpers = require('./helpers');

var PING_INTERVAL = 15000;
var PING_TIMEOUT = 5000;

var StableSocket = function (_EventEmitter) {
  _inherits(StableSocket, _EventEmitter);

  function StableSocket(url, SocketClass) {
    _classCallCheck(this, StableSocket);

    var _this = _possibleConstructorReturn(this, (StableSocket.__proto__ || Object.getPrototypeOf(StableSocket)).call(this));

    _this.wsUrl = url;
    _this.SocketClass = SocketClass;
    _this._headers = { 'Origin': 'https://blockchain.info' };
    _this._socket;
    _this._pingIntervalPID = null;
    _this._pingTimeoutPID = null;
    _this.setPongHandler();
    return _this;
  }

  _createClass(StableSocket, [{
    key: 'createSocket',
    value: function createSocket(url) {
      return new this.SocketClass(url, [], { headers: this._headers });
    }
  }, {
    key: 'connect',
    value: function connect() {
      var _this2 = this;

      if (!Helpers.tor() && this.isClosed) {
        try {
          this._pingIntervalPID = setInterval(this.ping.bind(this), PING_INTERVAL);
          this._socket = this.createSocket(this.url);
          this._socket.on('open', function () {
            return _this2.emit('open');
          });
          this._socket.on('message', function (message) {
            return _this2.emit('message', message.data);
          });
          this._socket.on('close', function () {
            return _this2.emit('close');
          });
        } catch (e) {
          console.error('Failed to connect to websocket', e);
        }
      }
    }
  }, {
    key: 'send',
    value: function send(data) {
      var _this3 = this;

      if (!Helpers.tor() && this.isOpen) this._socket.send(data);else if (this.isConnecting) this._socket.on('open', function () {
        return _this3.send(data);
      });
      return this;
    }
  }, {
    key: 'close',
    value: function close() {
      if (this.isOpen) this._socket.close();
      this._socket = null;
      this.clearPingInterval();
      this.clearPingTimeout();
      return this;
    }
  }, {
    key: 'ping',
    value: function ping() {
      var _this4 = this;

      this.send(StableSocket.pingMessage());
      this._pingTimeoutPID = setTimeout(function () {
        _this4.close();
        _this4.connect();
      }, PING_TIMEOUT);
    }
  }, {
    key: 'setPongHandler',
    value: function setPongHandler() {
      var _this5 = this;

      this.on('message', function (data) {
        JSON.parse(data).op === 'pong' && _this5.clearPingTimeout();
      });
    }
  }, {
    key: 'clearPingInterval',
    value: function clearPingInterval() {
      clearInterval(this._pingIntervalPID);
    }
  }, {
    key: 'clearPingTimeout',
    value: function clearPingTimeout() {
      clearTimeout(this._pingTimeoutPID);
    }
  }, {
    key: 'url',
    get: function get() {
      return this.wsUrl;
    }
  }, {
    key: 'isConnecting',
    get: function get() {
      return this._socket != null && this._socket.readyState === this._socket.CONNECTING;
    }
  }, {
    key: 'isOpen',
    get: function get() {
      return this._socket != null && this._socket.readyState === this._socket.OPEN;
    }
  }, {
    key: 'isClosing',
    get: function get() {
      return this._socket != null && this._socket.readyState === this._socket.CLOSING;
    }
  }, {
    key: 'isClosed',
    get: function get() {
      return this._socket == null || this._socket.readyState === this._socket.CLOSED;
    }
  }], [{
    key: 'op',
    value: function op(_op) {
      var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      return JSON.stringify(Object.assign({ op: _op }, data));
    }
  }, {
    key: 'pingMessage',
    value: function pingMessage() {
      return StableSocket.op('ping');
    }
  }]);

  return StableSocket;
}(EventEmitter);

module.exports = StableSocket;