var spawn = require('child_process').spawn;
var lircNode = require('../');
var assert = require('assert');

describe('IRReceive', function () {
  var irreceive;

  beforeEach(function () {
    lircNode.IRReceive._setInputListener(function () {
      return spawn('./irwsimulator.sh');
    });
    irreceive = new lircNode.IRReceive();
  });

  afterEach(function () {
    lircNode.IRReceive._killListeningProcess();
    lircNode.IRReceive._setInputListener(lircNode.IRReceive._DEFAULT_INPUT_LISTENER);
  });

  describe('#addListener', function () {
    it('should add a callback for the specified key / remote combo', function () {
      var f = function () {};
      var match = false;

      assert.equal(0, irreceive.callbacks.length);

      irreceive.addListener('KEY_OK', f);
      assert.equal(1, irreceive.callbacks.length);

      irreceive.callbacks.forEach(function (callback) {
        if (callback.key === 'KEY_OK' && callback.callback === f) {
          match = true;
        }
      });
      assert.equal(true, match);
    });

    it('should return an id', function () {
      var id = irreceive.addListener('KEY_OK', function () {});
      assert.notEqual(undefined, id);
    });

    it('should spawn new child process to listen for input, if not running', function () {
      var lp1 = lircNode.IRReceive._getListeningProcess();
      var irreceive2 = new lircNode.IRReceive();
      var lp2 = lircNode.IRReceive._getListeningProcess();

      assert.equal(undefined, lircNode.IRReceive._getListeningProcess(),
        'there should be no listening processes at the start');

      irreceive.addListener('KEY_OK', function () {});

      assert.notEqual(undefined, lp1,
        'there should be a listening process once a listener is added to irreceive');

      irreceive2.addListener('KEY_UP', function () {});

      assert.strictEqual(lp1, lp2,
        'subsequent listeners should use the existing listening process');
    });

    it('should throw if given unexpected argument types', function () {
      // good
      assert.doesNotThrow(irreceive.addListener.bind(irreceive, function () {}));
      assert.doesNotThrow(irreceive.addListener.bind(irreceive, 'KEY_OK', function () {}));
      assert.doesNotThrow(irreceive.addListener.bind(irreceive, 'KEY_OK',
        'my_remote', function () {}));
      assert.doesNotThrow(irreceive.addListener.bind(irreceive, 'KEY_OK', 'my_remote',
        function () {}, 1000));
      assert.doesNotThrow(irreceive.addListener.bind(irreceive, 'KEY_OK', function () {}, 1000));
      assert.doesNotThrow(irreceive.addListener.bind(irreceive, function () {}, 1000));

      // OK (extra ignored args)
      assert.doesNotThrow(irreceive.addListener.bind(irreceive, 'one', function () {},
        1000, 'two', 'three'));
      assert.doesNotThrow(irreceive.addListener.bind(irreceive, 'one', 'two', function () {},
        1000, 'three', 'four'));
      assert.doesNotThrow(irreceive.addListener.bind(irreceive, function () {}, 1000,
        'one', 'two'));

      // bad
      assert.throws(irreceive.addListener);
      assert.throws(irreceive.addListener.bind(irreceive, {}));
      assert.throws(irreceive.addListener.bind(irreceive, 'string but no callback function'));
      assert.throws(irreceive.addListener.bind(irreceive, 'string but no callback function',
        'and another'));
      assert.throws(irreceive.addListener.bind(irreceive, 'one', 'two', 'three strings',
        function () {}, 1000));
      assert.throws(irreceive.addListener.bind(irreceive, 'one', 'two', function () {},
        'not a Number'));
      assert.throws(irreceive.addListener.bind(irreceive, 'one', function () {},
        'not a Number'));
      assert.throws(irreceive.addListener.bind(irreceive, 'one', function () {}, 'two', 1000));
      assert.throws(irreceive.addListener.bind(irreceive, function () {}, 'one', 'two', 1000));
      assert.throws(irreceive.addListener.bind(irreceive, function () {}, 'one', 1000));
      assert.throws(irreceive.addListener.bind(irreceive, 1));
      assert.throws(irreceive.addListener.bind(irreceive, 1000, function () {}));
      assert.throws(irreceive.addListener.bind(irreceive, 1000, 'one', function () {}));
      assert.throws(irreceive.addListener.bind(irreceive, 1000, 'one', 'two', function () {}));
      assert.throws(irreceive.addListener.bind(irreceive, 1000, 'one', function () {}, 'two'));
      assert.throws(irreceive.addListener.bind(irreceive, 1000, function () {}, 'one', 'two'));
    });
  });

  describe('[child process listening for input] upon receiving input', function () {
    it('should execute all callbacks matching key and remote', function (done) {
      var totalCallbacks = 0;

      lircNode.IRReceive._setInputListener(function () {
        return spawn('./irwsimulator.sh', ['remoteAndKeyTest']);
      });

      function notifyDone() {
        totalCallbacks++;
      }

      irreceive.addListener('KEY_LEFT', 'remote2', notifyDone);
      irreceive.addListener('KEY_DONE', function () {
        assert.equal(1, totalCallbacks);
        done();
      });
    });

    it('should execute callbacks matching the key if no remote specified', function (done) {
      var totalCallbacks = 0;

      lircNode.IRReceive._setInputListener(function () {
        return spawn('./irwsimulator.sh', ['remoteAndKeyTest']);
      });

      function notifyDone() {
        totalCallbacks++;
      }

      irreceive.addListener('KEY_LEFT', notifyDone);
      irreceive.addListener('KEY_DONE', function () {
        assert.equal(2, totalCallbacks);
        done();
      });
    });

    it('should execute all callbacks set with no key and no remote specified', function (done) {
      var totalCallbacks = 0;

      lircNode.IRReceive._setInputListener(function () {
        return spawn('./irwsimulator.sh', ['remoteAndKeyTest']);
      });

      function notifyDone() {
        totalCallbacks++;
      }

      irreceive.addListener('KEY_DONE', function () {
        assert.equal(4, totalCallbacks);
        done();
      });
      irreceive.addListener(notifyDone);
    });

    it('should execute callback(s) each time input is received, if no throttle set', function (done) {
      var totalCallbacks = 0;

      lircNode.IRReceive._setInputListener(function () {
        return spawn('./irwsimulator.sh');
      });

      function notifyDone() {
        totalCallbacks++;
      }

      irreceive.addListener('KEY_DONE', function () {
        assert.equal(40, totalCallbacks);
        done();
      });

      irreceive.addListener(notifyDone);
    });

    it('should execute callback(s) just once while key is held down, if throttle set to 0', function (done) {
      var totalCallbacks = 0;

      lircNode.IRReceive._setInputListener(function () {
        return spawn('./irwsimulator.sh');
      });


      function notifyDone() {
        totalCallbacks++;
      }

      irreceive.addListener('KEY_DONE', function () {
        assert.equal(1, totalCallbacks);
        done();
      });
      irreceive.addListener(notifyDone, 0);
    });

    it('should execute callback(s) once every N ms while key held down, if throttle set to positive integer', function (done) {
      var totalCallbacks = 0;

      lircNode.IRReceive._setInputListener(function () {
        return spawn('./irwsimulator.sh');
      });

      function notifyDone() {
        totalCallbacks++;
      }

      irreceive.addListener('KEY_DONE', function () {
        assert.equal(4, totalCallbacks);
        done();
      });

      irreceive.addListener(notifyDone, 1000);
    });

    it('should call the callback with the correct data in the argument', function (done) {
      lircNode.IRReceive._setInputListener(function () {
        return spawn('./irwsimulator.sh', ['dataTest']);
      });

      irreceive.addListener(function (data) {
        assert.equal('0000000000000000', data.code);
        assert.equal(0, data.repeat);
        assert.equal('KEY_HOME', data.key);
        assert.equal('remote42', data.remote);
        done();
      });
    });
  });

  describe('#removeListener', function () {
    it('should remove the listener', function () {
      var id1 = irreceive.addListener(function () {});
      var id2 = irreceive.addListener(function () {});

      assert.equal(2, irreceive.numCallbacks);

      irreceive.removeListener(id2);

      assert.equal(1, irreceive.numCallbacks);
      assert.equal(null, irreceive.callbacks[id2]);
      assert.notEqual(null, irreceive.callbacks[id1]);
    });

    it('should ensure that future calls to #removeListener will still work with the ids originally returned', function () {
      var id1 = irreceive.addListener(function () {});
      var id2 = irreceive.addListener(function () {});
      var id3 = irreceive.addListener(function () {});

      assert.equal(3, irreceive.numCallbacks);

      irreceive.removeListener(id2);

      assert.equal(2, irreceive.numCallbacks);

      irreceive.removeListener(id1);

      assert.equal(1, irreceive.numCallbacks);

      irreceive.removeListener(id3);

      assert.equal(0, irreceive.numCallbacks);
    });

    it('should kill the child process listening for input, if there are no more listeners to remove', function () {
      var id1 = irreceive.addListener(function () {});

      assert.equal(undefined, lircNode.IRReceive._getListeningProcess());
      assert.notEqual(undefined, lircNode.IRReceive._getListeningProcess());

      irreceive.removeListener(id1);

      assert.equal(undefined, lircNode.IRReceive._getListeningProcess());
    });
  });

  it('should support multiple instances and notify each instance of every event', function (done) {
    var flags = [];
    var irreceive2 = new lircNode.IRReceive();

    function notifyDone(id) {
      flags[id] = true;
      if (flags[0] && flags[1]) {
        done();
      }
    }
    irreceive.addListener(notifyDone.bind(null, 0));
    irreceive2.addListener(notifyDone.bind(null, 1));
  });
});
