/*
 *  author: vic wang
 *  website: www.debuggap.com
 */

var _net = require('net');
var _crypto = require('crypto');
var _https = require('https');
var _http = require('http');
var _url = require('url');
/*
* Class:File
*/

function File() {
  var _fs = require('fs');
  var _path = require('path');

  this.writeFile = function(path, data, callback) {
    this.createPath(path);
    if (typeof callback == "function") {
      _fs.writeFile(path, data, callback);
    } else {
      return _fs.writeFileSync(path, data);
    }
  }

  this.removeFile = function(path) {
    _fs.unlink(path,
    function() {});
  }

  this.createPath = function(path) {
    path = path.split('/');
    path = path.slice(1, -1);
    var str = "./";
    for (var i = 0; i < path.length; i++) {
      str += path[i] + '/';
      if (!_fs.existsSync(str)) {
        _fs.mkdir(str);
      }
    }
  }
}

/*
*Class:curl
*
*/

function Curl() {
  this.get = function(url, callback, header) {
    var opt = _url.parse(url);
    opt.headers = header;
    _http.get(opt,
    function(res) {
      console.log("Got response: " + res.statusCode);
      var data = new Buffer(0);
      res.on('data',
      function(chunk) {
        data = Buffer.concat([data, chunk]);
      });

      res.on('end',
      function() {
        callback && callback(data);
      });
    }).on('error',
    function(e) {
      console.log("Got error: " + e.message);
    });
  }
}

/*
* Class:Proxy
*/
function Proxy() {

  this.getData = function(data, initFn, finishFn) {
    /*
		* parse header from the request
		*/
    var request = this.parseHeader(data);

    //store the uniqueId
    var uniqueId = _crypto.createHash('md5').update(request.requestHeaders['User-Agent']).digest('hex');

    //if this request is inner, don't call <initFn> function
    //if the request is xmlHttpRequest,don't call <initFn> function too.
    if (!request.requestHeaders.innerUse && request.requestHeaders.XHR != 'true') {
      initFn(uniqueId, request);
    }

    /*
		* in some case,the request is used in the product,we should treat it accordingly.
		* if the return is false,the proxy should continue to sending the request.
		*/

    if (!this.handleException(request, finishFn)) {
      this.sendRequest(uniqueId, request, finishFn);
    }

  }

  this.sendRequest = function(uniqueId, request, fn) {

    var header = request.requestHeaders;
    var mod = request.location.protocol == "http:" ? _http: _https;
    header.host = request.location.host;
    header.path = request.location.path;
    header.method = request.method;

    var req = mod.request(header,
    function(res) {
      var data = new Buffer(0);
      res.on('data',
      function(chunk) {
        data = Buffer.concat([data, chunk]);
      });

      res.on('end',
      function() {

        var result = {
          statusCode: res.statusCode,
          id: request.id,
          data: data,
          responseHeaders: res.headers,
          requestHeaders: header,
          pathname: request.location.pathname,
          innerUse: request.requestHeaders.innerUse,
          host: header.host
        }
        fn(uniqueId, result);
      });
      res.on('error',
      function() {
        console.log(arguments);
      })
    });

    req.on('error',
    function(e) {
      DgServer.log('problem with request: ' + e + " url:" + header.host);

      var result = {
        statusCode: '500',
        id: request.id,
        data: '',
        size: '',
        responseHeaders: {},
        pathname: request.location.pathname
      }
      if (e.code == 'ENOTFOUND') {
        result.statusCode = '404';
      }
      fn(uniqueId, result);
    });

    if (request.method.toLowerCase() != "get") {
      req.write(request.payload);
    }
    req.end();
  }

  this.handleException = function(request, finishFn) {
    if (/debuggap_get_proxy/.test(request.location.path)) {
      //send the host and port to client,so that the client can connect the remote DebugGap
      finishFn(null, {
        data: new Buffer(JSON.stringify(config.host + ':' + config.port))
      });
      return true;
    }
    return false;
  }

  this.parseHeader = function(data) {
    data = data.toString().trim('\r\n');
    data = data.split("\r\n");
    var tmp = data.shift().split(' ');
    var header = {},
    request = {};
    var payload = null;
    for (var i in data) {
      if (data[i]) {
        var index = data[i].indexOf(":");
        if (index == -1) {
          payload = data[i];
          request.payload = payload;
        } else {
          header[data[i].slice(0, index)] = data[i].slice(index + 1).trim(' ');
        }
      }
    }

    request.method = tmp[0];
    request.location = _url.parse(tmp[1]);
    request.httpVersion = tmp[2];
    request.requestHeaders = header;
    return request;
  }
}

function Route() {
  //routing for request
  this.routes = {
    'post': {
      '/scriptSocket': 'send_script_socket'
    },
    'get': {
      '/': 'server_status',
      '/scriptSocket/init': 'script_socket_init',
      '/scriptSocket': 'get_script_socket',
      '/scriptSocket/close': 'close_script_socket',
      '/proxy': 'proxy',
      '/injectCss': 'injectCss'
    },
    'options': 'deal_options'
  }

  this.get_function_name = function(method, url) {
    var obj = this.routes[method.toLowerCase()];
    var function_name = null;
    if (typeof obj == 'object') {
      function_name = obj[url];
      if (!function_name) {
        function_name = 'request_error';
      }
    } else if (obj) {
      function_name = obj;
    } else {
      function_name = 'request_error';
    }
    return function_name;
  }
}

/*
 * Class:DgServer
 */
function DgServer() {

  //private:restore the clients
  var clients = [];

  //client instance of control page
  this.index = null;
  
  // version
  this.version = '1.0.0'

  //this list of url will not be requested
  var exceptionUrl = {}

  //script socket data
  this.scriptData = {};

  //proxy object
  var proxy = new Proxy();
  var curl = new Curl();

  //for routing
  this.routing = new Route();

  this.start = function() {
    var self = this;
    //create server
    server = _net.createServer(function(socket) {
      //DgServer.log("new client comes"+clients.length);
      //create the client
      var client = self.createClient(socket);
      var data, dataLen = 0,
      totalLen = 0;
      var dstSocket;

      //add the event to receive data
      socket.on('data',
      function(frameData) {

        if (client.isHttps) {
          dstSocket.write(frameData);
          return;
        }

        var frameString = frameData.toString();

        if (frameData[0] == 0x81 || totalLen != 0) {
          if (frameData[0] == 0x81) {
            var frameLen = frameData[1] & 0x7F;
            if (frameLen == 0x7f) {
              totalLen = frameData.readUInt32BE(2) * Math.pow(2, 32) + frameData.readUInt32BE(6) + 14;
            } else if (frameLen == 0x7e) {
              totalLen = frameData.readUInt16BE(2) + 8;
            } else {
              totalLen = frameLen + 6;
            }
            data = new Buffer(totalLen);
          }
          frameData.copy(data, dataLen);
          dataLen += frameData.length;
          if (dataLen < totalLen) {
            return;
          } else {
            totalLen = 0;
            dataLen = 0;
          }
        } else if (frameString.match(/^GET \/debuggap_/)) {
          //websockt header
          data = frameData;

        } else if (!frameString.match(/^[A-Z]+\shttp/) && !frameString.match(/^CONNECT/)) {
          //for early websocket data
          if (frameData[0] == 0) {
            data = frameData;
          } else {
            var tempData = new Buffer(data.length + frameData.length);
            data.copy(tempData, 0, 0, data.length);
            frameData.copy(tempData, data.length, 0, frameData.length);
            data = tempData;
            delete tempData;
          }

          if (frameData[frameData.length - 1] != 255) {
            return;
          }

        } else if (frameString.match(/^CONNECT/)) {

          var frameData = frameString;

          var arr = frameData.match(/CONNECT\s([^\s]+)\s/)[1];
          arr = arr.split(":");
          if (arr[1] == 443) {
            dstSocket = new _net.Socket();
            dstSocket.connect(arr[1], arr[0]);
            dstSocket.on('data',
            function(data) {
              socket.write(data);
            });
            client.isHttps = 1;
          }
          socket.end(new Buffer("HTTP/1.1 200 Connection established\r\nConnection: close\r\n\r\n"));
          return;
        } else {
          //network request
          removeClient(client);
          var TimeStart = new Date().getTime();
          proxy.getData(frameData,
          function(uniqueId, request) {
            //init the network request to the remote client
            request.id = new Date().getTime() * 1000 + Math.floor(Math.random() * 1000);
            var client = mapClientById(uniqueId);
            if (client) {
              client.communicate("initRequest:" + JSON.stringify(request));
            } else {
              exceptionUrl[request.location.host] = 1;
            }
          },
          function(uniqueId, result) {
            var client = mapClientById(uniqueId);
            result.times = new Date().getTime() - TimeStart;
            socket.end(result.data);
            if (client && !result.innerUse && !result.requestHeaders.XHR) {
              if (/\.(jpg|jpeg|gif|png|bmp)$/.test(result.pathname.toLowerCase())) {
                result.size = result.data.length;
                delete result.data;
              } else {
                result.data = result.data.toString('utf8');
                result.size = Buffer.byteLength(result.data);
              }
              delete result.pathname;
              client.communicate("resultRequest:" + JSON.stringify(result));
            } else if (!client && uniqueId) {
              exceptionUrl[result.host] = 1;
            }
            return;
          });
          return;
        }

        if (!client.finishHandShake) {
          var name = client.handShake(data);

          //assign the main page
          if (name == "debuggap_index") {

            self.index = client;
            self.index.dstClient = client.socket;
          } else if (name.substr(0, 14) == "debuggap_child") {
            //build the relationship
            name = name.substr(14);
            var mapClient = mapClientById(name);
            if (mapClient) {
              //this is for web socket
              client.communicate("ready:true");
              client.dstClient = mapClient.socket;
              mapClient.dstClient = client.socket;
              if (mapClient.earlyWebsocket) {
                client.toEarlyWebsocket = 1;
              }
            } else if (self.scriptData[name]) {
              //here is for script socket
              client.communicate("ready:true");
            } else {
              client.communicate("ready:false");
            }
          } else if (name == "debuggap_client") {
            DgServer.log("new client comes");
            /*
                         * do nothing and wait for the initializing message from client.
                         * and then set the uniqueId for the client.
                         */
          } else {
            //DgServer.log("Error: please start the index page firstly","error");
          }
        } else if (client.uniqueId == "debuggap_client") {
          //set the uniqueId for client and then notice the main page
          client.clientInfo = decodeURIComponent(client.decode(data)).slice(11);
          if (!client.clientInfo) {
            return;
          }
          //match the version of debuggap client and remote
          var arr = client.clientInfo.split('_debuggap_');
          if (arr && arr[0]) {
            if (arr.length != 3) {
              DgServer.log('Please upgrade your debuggap.js(' + self.version + ') file', 'error');
              return;
            } else if (arr[0] != self.version) {
              DgServer.log("version of DebugGap client(" + arr[0] + ") does not match this remote version(" + self.version + ")", 'error');
              return;
            } else {
              client.clientInfo = arr[1];
              client.url = arr[2];
            }
          }
          //clean up clientInfo  example 'Mozilla/5.0 .. safari(Safari/537.36) (ad)'
          client.clientInfo = client.clientInfo.replace(/\s+\([^)]{1,2}\)$/, '');
          var uniqueId = _crypto.createHash('md5').update(client.clientInfo + client.url).digest('hex');
          var existedClient = mapClientById(uniqueId);
          if (existedClient) {
            DgServer.log("this client has existed!", "error");
            //remove the client from clients
            removeClient(existedClient);
            client.uniqueId = uniqueId;
            return;
          } else {
            client.uniqueId = uniqueId;
          }

          self.noticeIndexPage(uniqueId, client.clientInfo, client.url);

          //tell this client itself that connection is ok
          client.communicate("ready:true");
        } else {
          var content = decodeURIComponent(client.decode(data).toString());

          if (client.dstClient == client.socket && self.scriptData[client.uniqueId.substr(14)]) {
            //here is for script socket
            content = encodeURIComponent(content);
            self.scriptData[client.uniqueId.substr(14)]['go'].push(content);
          } else {
            //this is for web socket
            client.communicate(content);
            //client.communicate( data,1 );
          }
        }

      });

      //socket is closed by all kinds of actions.
      socket.on('close',
      function(had_error) {
        //remove this socket which keeps the connection with client
        var client = filterClient(socket);
        if (client && client.clientInfo && client.uniqueId) {
          self.index.communicate(client.uniqueId + "_debuggap_close");
          if (client.dstClient) {
            client.dstClient.destroy();
          };
        }
        removeClient(client);

        DgServer.log("one client has closed");
        delete socket;
      });

    });

    //listen the specified port
    server.listen(config.port, config.host,
    function() {
      DgServer.log("Service:" + config.host + ':' + config.port, {
        'font-size': '20px',
        'text-align': 'center',
        width: '100%',
        'border-bottom': '2px dotted #ccc',
        'display': 'inline-block',
        'padding': '10px 0px',
        'margin-bottom': '5px'
      });
    });

    server.on('connection',
    function(socket) {
      socket.setTimeout(0);
      socket.setNoDelay(true);
      socket.setKeepAlive(true, 0);
    });

    server.on('close',
    function() {
      DgServer.log("server is down");
    });

    var httpServer = _http.createServer(function(req, res) {
      var httpBuffer = new Buffer(0);

      var function_name = self.routing.get_function_name(req.method, req.url.split('?')[0]);

      req.on('data',
      function(chunk) {
        httpBuffer = Buffer.concat([httpBuffer, chunk]);
      });

      req.on('end',
      function() {
        frameString = httpBuffer.toString();
        self[function_name].call(self, res, frameString, req);
      });
    });

    httpServer.listen(parseInt(config.port) + 1, config.host,
    function() {
      console.log('http server starts');
    });
    this.server = server
    this.httpServer = httpServer
  };
  
  this.destroy = function () {
    this.server.close()
    this.httpServer.close()
  }

  this.deal_options = function(res, data) {
    res.writeHead('200', {
      'Access-Control-Allow-Methods': 'GET, POST',
      'Access-Control-Allow-Headers': 'innerUse,XHR,origin,content-type',
      'Access-Control-Allow-Origin': '*'
    });
    res.end();
  }

  this.server_status = function(res) {
    this.common_output(res, 200, 'it works');
  }

  this.request_error = function(res) {
    this.common_output(res, 500, 'error');
  }

  this.script_socket_init = function(res, data, req) {
    var uniqueId = _crypto.createHash('md5').update(req.headers['user-agent'] + req.headers['referer']).digest('hex');
    this.scriptData[uniqueId] = {
      come: [],
      go: [],
      noticeIndex: 0
    };

    res.writeHead(200, {
      'Content-Type': 'application/javascript'
    });
    res.end('debuggap.scriptSocket.handShake()');
    DgServer.log("new client comes");
  }

  this.get_script_socket = function(res, data, req) {
    var uniqueId = _crypto.createHash('md5').update(req.headers['user-agent'] + req.headers['referer']).digest('hex');
    var content = '';
    if (this.scriptData[uniqueId] && this.scriptData[uniqueId]['go'].length) {
      content = this.scriptData[uniqueId]['go'].shift();
      content = "debuggap.scriptSocket.handle('" + content + "')";
    }

    //return the result
    res.writeHead(200, {
      'Content-Type': 'application/javascript'
    });
    res.end(content);

    //check the coming data
    if (this.scriptData[uniqueId] && this.scriptData[uniqueId]['come'].length) {
      var mapClient = mapClientById('debuggap_child' + uniqueId);
      if (mapClient) {
        content = this.scriptData[uniqueId]['come'].shift();
        mapClient.communicate(content);
      }
    }
  }

  this.send_script_socket = function(res, data, req) {
    var uniqueId = _crypto.createHash('md5').update(req.headers['user-agent'] + req.headers['referer']).digest('hex');
    var content = '';

    if (this.scriptData[uniqueId] && !this.scriptData[uniqueId].noticeIndex) {
      this.scriptData[uniqueId].noticeIndex = 1;
      //show the client tab in the index page.
      this.noticeIndexPage(uniqueId, req.headers['user-agent'], req.headers['referer']);
    } else {
      //store the contents
      if (data) {
        content = decodeURIComponent(data);
        this.scriptData[uniqueId]['come'].push(content);
      }
    }

    this.common_output(res, 200, 'ok');
  }

  this.close_script_socket = function(res, data, req) {
    var uniqueId = _crypto.createHash('md5').update(req.headers['user-agent'] + req.headers['referer']).digest('hex');
    this.index.communicate(uniqueId + "_debuggap_close");
    DgServer.log("one client has closed");
    delete this.scriptData[uniqueId];
  }

  this.proxy = function(res, data, req) {
    var match = req.url.match(/\/proxy\?url=(\S+)/);
    var self = this;
    if (match && match[1]) {
      curl.get(decodeURIComponent(match[1]),
      function(data) {
        self.common_output(res, 200, data);
      },
      {
        Referer: 'http://www.debuggap.com'
      });
    }
  }

  this._injectCssObj = {};

  this.injectCss = function(res, data, req) {
    var url = req.url.replace('/injectCss?', '').replace(/\+/g, '%20');
    url = decodeURIComponent(url);
    var arr = url.split('&');
    var obj = {};
    $.each(arr,
    function(index, item) {
      var temp = item.split('=');
      obj[temp[0]] = temp[1];
    });
    if (!obj.uniqueId) {
      this.common_output(res, 404, 'Error');
      return;
    }
    if (obj.type == 'add') {
      if (!this._injectCssObj[obj.uniqueId]) {
        this._injectCssObj[obj.uniqueId] = {};
      }
      if (!this._injectCssObj[obj.uniqueId][obj.title]) {
        this._injectCssObj[obj.uniqueId][obj.title] = {};
      }
      this._injectCssObj[obj.uniqueId][obj.title][obj.key] = obj.value;
      this.common_output(res, 200, 'ok');
    } else {
      res.writeHead('200', {
        'Content-Type': 'text/css'
      });
      if (this._injectCssObj[obj.uniqueId]) {
        obj = this._injectCssObj[obj.uniqueId];
        var str = [],
        values,
        key,
        title;
        for (title in obj) {
          str.push(title + '{');
          values = obj[title];
          for (var key in values) {
            str.push(key + ":" + values[key] + ';');
          }
          str.push('}\n');
        }
        str = str.join('');
        console.log(str);
        res.write(str);
      }
      res.end();
    }
  }

  this.common_output = function(res, statusCode, data) {
    res.writeHead(statusCode, {
      'Access-Control-Allow-Origin': '*',
      'Content-Length': data.length
    });
    res.end(data);
  }

  this.noticeIndexPage = function(uniqueId, clientInfo, url) {
    //tell client list page that this client has connected successfully
    this.index.communicate(uniqueId + "_debuggap_" + clientInfo + '_debuggap_' + url);
  }

  /*
     * according to the socket, find out the client
     * @type: private
     * @param: socket
     * @return: mapped client
     */
  var filterClient = function(socket) {
    var client = null;
    for (var i = 0; i < clients.length; i++) {
      if (clients[i].socket == socket) {
        client = clients[i];
        break;
      }
    }
    return client;
  };

  /*
     * map the client according to the given uniqueId
     * @type: private
     * @param: uniqueId
     * @return: mapped client
     */
  var mapClientById = function(uniqueId) {
    var client = null;
    for (var i = 0; i < clients.length; i++) {
      if (clients[i].uniqueId == uniqueId) {
        client = clients[i];
        break;
      }
    }
    return client;
  };

  /*
     * remove the client in the queue according to client
     * @type: private
     * @param: client
     * @return: null
     */
  var removeClient = function(client) {
    for (var i = 0; i < clients.length; i++) {
      if (clients[i] == client) {
        clients.splice(i, 1);
        break;
      }
    }
  };

  /*
     * create the client
     * @type: public
     * @param: socket
     * @return: successful client
     */
  this.createClient = function(socket) {
    var client = new DgClient(socket);
    clients.push(client);
    return client;
  }

  /*
     *build the two-way communication
     *@type:private
     */

  var doConnect = function(socket, header) {
    var header = header.toString();

    var arr = header.match(/CONNECT\s([^\s]+)\s/)[1];
    arr = arr.split(":");
    if (arr[1] == 443) {
      return;
    }
    var server = _net.createConnection(arr[1], arr[0]);

    socket.on("data",
    function(data) {
      DgServer.log("socket side:" + data);
      server.write(data);
    });
    server.on("data",
    function(data) {
      DgServer.log("server side:" + data);
      socket.write(data);
    });

    socket.write(new Buffer("HTTP/1.1 200 Connection established\r\nConnection: close\r\n\r\n"));
  }

}

/*
 * static method to output the log 
 */
DgServer.log = function() {
  var type = 0;
  if (type) {
    var fs = require('fs');
    var buf = arguments[0],
    buf1;
    fs.open('./1.log', 'a+',
    function(err, fd) {
      if (!Buffer.isBuffer(buf)) {
        buf1 = new Buffer(buf + "\r\n");
      } else {
        buf1 = new Buffer(buf.length + 2);
        buf.copy(buf1, 0);
        buf1.write("\r\m");
      }
      fs.write(fd, buf1, 0, buf1.length);
    });
  } else {
    //console.log.apply(console,arguments);
    addLog(arguments[0], arguments[1]);
  }
};

/*
 * client
 */
function DgClient(socket) {

  this.socket = socket;
  this.dstClient = socket;
  this.finishHandShake = false;
  this.clientInfo = "";
  this.url = ''; //client url
  this.uniqueId = "";
  this.earlyWebsocket = 0;
  this.toEarlyWebsocket = 0;

  //get socket head
  this.getSocketHeader = function(data) {

    data = data.toString('binary');
    //console.log(data);
    var head = {
      get: "",
      key: ""
    },
    match;

    if (match = data.match(/GET \/(.*) HTTP\/1\.1\r\n/)) {
      this.uniqueId = head.get = match[1];
    }
    if (match = data.match(/Sec-WebSocket-Key: (.*)\r\n/)) {
      head.key = match[1];
    }

    if (!head.key) {
      var keyBuffer = "",
      key;
      if (match = data.match(/Sec-WebSocket-Key1: (.*)\r\n/)) {
        key = match[1];
        key = parseInt(key.replace(/[^0-9]/g, '')) / parseInt(key.replace(/[^\s]/g, '').length);
        keyBuffer += String.fromCharCode.apply(null, [3, 2, 1, 0].map(function(i) {
          return key >> 8 * i & 0xff
        }));
      }
      if (match = data.match(/Sec-WebSocket-Key2: (.*)\r\n/)) {
        key = match[1];
        key = parseInt(key.replace(/[^0-9]/g, '')) / parseInt(key.replace(/[^\s]/g, '').length);
        keyBuffer += String.fromCharCode.apply(null, [3, 2, 1, 0].map(function(i) {
          return key >> 8 * i & 0xff
        }));
      }

      if (match = data.match(/Origin: (.*)\r\n/)) {
        head.origin = match[1];
      }
      if (match = data.match(/Host: (.*)\r\n/)) {
        head.host = match[1];
      }
      try {
        key = data.match(/\r\n\r\n([\s\S]+)/)[1];
        keyBuffer += key;
        //keyBuffer.write(key,8);
        head.key = _crypto.createHash('md5').update(keyBuffer).digest('binary');
        //set the flag for early websocket protocal
        this.earlyWebsocket = 1;
      } catch(e) {}
    } else {
      var sha1 = _crypto.createHash('sha1');
      sha1.update(head.key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11');
      head.key = sha1.digest('base64');
    }

    return head;
  };

  this.handShake = function(data) {

    var head = this.getSocketHeader(data);

    if (!head.origin) {
      var httpHead = "HTTP/1.1 101 Switching Protocols\r\n" + "Upgrade: websocket\r\n" + "Connection: Upgrade\r\n" + "Sec-WebSocket-Protocol: websocket\r\n" + "Sec-WebSocket-Accept: " + head.key + "\r\n\r\n";
    } else {
      var httpHead = "HTTP/1.1 101 WebSocket Protocol Handshake\r\n" + "Upgrade: WebSocket\r\n" + "Connection: Upgrade\r\n" + 'Sec-WebSocket-Origin: ' + head.origin + '\r\n' + 'Sec-WebSocket-Location: ws://' + head.host + '/' + head.get + '\r\n' + "Sec-WebSocket-Protocol: websocket\r\n\r\n" + head.key;
    }

    this.socket.write(httpHead, 'binary');
    //set the flag for handShake
    this.finishHandShake = true;
    return head.get;
  };

  this.encode = function(data) {
    var buf;
    if (this.toEarlyWebsocket) {
      var fa = 0x00,
      fe = 0xff,
      data = data.toString();
      var len = 2 + Buffer.byteLength(data);
      buf = new Buffer(len);

      buf[0] = fa;
      buf.write(data, 1);
      buf[len - 1] = fe;
    } else {

      if (!Buffer.isBuffer(data)) {
        data = new Buffer(data);
      }
      var len = data.length;
      if (len < 126) {
        buf = new Buffer(len + 2);
        buf[0] = 0x81;
        buf[1] = len;
        data.copy(buf, 2, 0);
      } else if (len < Math.pow(2, 16)) {
        buf = new Buffer(len + 4);
        buf[0] = 0x81;
        buf[1] = 0x7e;
        buf.writeUInt16BE(len, 2);
        data.copy(buf, 4, 0);
      } else {
        buf = new Buffer(len + 10);
        buf[0] = 0x81;
        buf[1] = 0x7f;
        var l = Math.floor(len / Math.pow(2, 32));
        var r = len % Math.pow(2, 32);
        buf.writeUInt32BE(l, 2);
        buf.writeUInt32BE(r, 6);
        data.copy(buf, 10, 0);
      }
    }
    return buf;
  };

  this.decode = function(data) {
    if (this.earlyWebsocket) {
      return data.slice(1, data.length - 1);
    } else {
      var buf, mask;
      var payloadLen = data[1] & 0x7F;

      if (payloadLen < 126) {
        buf = new Buffer(data.length - 6);
        mask = data.slice(2, 6);
        data.copy(buf, 0, 6);
      } else if (payloadLen == 126) {
        buf = new Buffer(data.length - 8);
        mask = data.slice(4, 8);
        data.copy(buf, 0, 8);
      } else {
        var buf = new Buffer(data.length - 14);
        mask = data.slice(10, 14);
        data.copy(buf, 0, 14);
      }
      for (var i = 0; i < buf.length; i++) {
        buf[i] ^= mask[i % 4];
      }
      return buf;
    }
  };

  this.communicate = function(data, flag) {
    if (!this.dstClient) {
      return;
    }
    if (!flag) {
      data = encodeURIComponent(data);
      data = this.encode(data);
    } else {
      data = this.encode(this.decode(data));
    }
    this.dstClient.write(data);
  }
};

process.on('uncaughtException',
function(err) {
  //    console.log("\nError!!!!");
  //    console.log(err);
});