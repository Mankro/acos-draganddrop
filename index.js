(function() {
  var Draganddrop, exerciseCache, finalFeedbackPayloadTransformer, fs, njEnv, nunjucks, pacutil, path,
    hasProp = {}.hasOwnProperty;

  fs = require('fs');

  path = require('path');

  nunjucks = require('nunjucks');

  pacutil = require('acos-clickdragfillin-util');

  // nunjucks views (templates)
  njEnv = nunjucks.configure(path.join(__dirname, 'views'));

  // cache parsed XML exercise definitions
  exerciseCache = {};

  // Modify the JSON payload for the final feedback
  finalFeedbackPayloadTransformer = function(payload, serverAddress) {
    var data, label, ref;
    ref = payload.draggables;
    for (label in ref) {
      if (!hasProp.call(ref, label)) continue;
      data = ref[label];
      delete data.reuse;
    }
    delete payload.finalcomment;
    return null;
  };

  Draganddrop = {
    // Registers the content type at server startup
    register: function(handlers, app, conf) {
      handlers.contentTypes.draganddrop = Draganddrop;
      fs.mkdir(conf.logDirectory + `/${Draganddrop.namespace}/`, 0o0775, (function(err) {}));
      Draganddrop.config = conf;
      return Draganddrop.handlers = handlers;
    },
    
    // Adds a content package (at server startup)
    registerContentPackage: function(contentPackagePrototype, contentPackageDir) {
      // Autodiscover exercises: any XML file in the content package directory "exercises"
      // is assumed to be an exercise (with a corresponding JSON file). The files may be nested
      // in subdirectories.
      return pacutil.registerContentPackage(contentPackagePrototype, contentPackageDir);
    },
    
    // Initializes the exercise (called when a user starts an exercise)
    initialize: function(req, params, handlers, cb) {
      return pacutil.initializeContentType(Draganddrop, njEnv, exerciseCache, req, params, handlers, cb);
    },
    handleEvent: function(event, payload, req, res, protocolPayload, responseObj, cb) {
      if (event === 'grade' && (payload.feedback != null)) {
        pacutil.buildFinalFeedback(Draganddrop, Draganddrop.handlers.contentPackages[req.params.contentPackage], __dirname, Draganddrop.config.serverAddress, njEnv, exerciseCache, payload, req, finalFeedbackPayloadTransformer, function() {
          return cb(event, payload, req, res, protocolPayload, responseObj); // cb is called in the callback in this if branch
        });
        return;
      } else if (event === 'log' && (Draganddrop.handlers.contentPackages[req.params.contentPackage].meta.contents[req.params.name] != null)) {
        // log event, checked that the exercise (req.params.name) has been registered in the content package
        pacutil.writeExerciseLogEvent(Draganddrop.config.logDirectory, Draganddrop, payload, req, protocolPayload);
      }
      return cb(event, payload, req, res, protocolPayload, responseObj);
    },
    // Metadata
    namespace: 'draganddrop',
    packageType: 'content-type',
    installedContentPackages: [],
    meta: {
      'name': 'draganddrop',
      'shortDescription': 'Content type for drag-and-drop exercises.',
      'description': 'Content type for drag-and-drop exercises.',
      'author': 'Markku Riekkinen',
      'license': 'MIT',
      'version': '0.3.0',
      'url': ''
    }
  };

  module.exports = Draganddrop;

}).call(this);
