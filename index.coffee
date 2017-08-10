fs = require('fs')
path = require('path')
nunjucks = require('nunjucks')
pacutil = require('clickdragfillin-util')

# nunjucks views (templates)
njEnv = nunjucks.configure(path.join(__dirname, 'views'))

# cache parsed XML exercise definitions
exerciseCache = {}


# Modify the JSON payload for the final feedback
finalFeedbackPayloadTransformer = (payload, serverAddress) ->
  for own label, data of payload.draggables
    delete data.reuse
    pacutil.convertRelativeUrlsInHtmlStrings(data.feedback, serverAddress) if data.feedback?
  for own label, data of payload.droppables
    pacutil.convertRelativeUrlsInHtmlStrings(data.feedback, serverAddress) if data.feedback?
  if payload.combinedfeedback?
    for comboObj in payload.combinedfeedback
      comboObj.feedback = pacutil.convertRelativeUrlsInHtml comboObj.feedback, serverAddress
  null


Draganddrop =

  # Registers the content type at server startup
  register: (handlers, app, conf) ->
    handlers.contentTypes.draganddrop = Draganddrop
    fs.mkdir(conf.logDirectory + "/#{ Draganddrop.namespace }/", 0o0775, ((err) -> ))
    Draganddrop.config = conf
    Draganddrop.handlers = handlers
    
  
  # Adds a content package (at server startup)
  registerContentPackage: (contentPackagePrototype, contentPackageDir) ->
    # Autodiscover exercises: any XML file in the content package directory "exercises"
    # is assumed to be an exercise (with a corresponding JSON file). The files may be nested
    # in subdirectories.
    pacutil.registerContentPackage contentPackagePrototype, contentPackageDir
    
  
  # Initializes the exercise (called when a user starts an exercise)
  initialize: (req, params, handlers, cb) ->
    pacutil.initializeContentType(Draganddrop, njEnv, exerciseCache, req, params, handlers, cb)
    
  
  handleEvent: (event, payload, req, res, protocolPayload, responseObj, cb) ->
    if event == 'grade' and payload.feedback?
      pacutil.buildFinalFeedback(Draganddrop, Draganddrop.handlers.contentPackages[req.params.contentPackage],
        __dirname, Draganddrop.config.serverAddress, njEnv, exerciseCache, payload, req,
        finalFeedbackPayloadTransformer,
        () -> cb(event, payload, req, res, protocolPayload, responseObj))
      
      return # cb is called in the callback in this if branch
      
    else if (event == 'log' and
        Draganddrop.handlers.contentPackages[req.params.contentPackage].meta.contents[req.params.name]?)
      # log event, checked that the exercise (req.params.name) has been registered in the content package
      pacutil.writeExerciseLogEvent(Draganddrop.config.logDirectory, Draganddrop, payload, req, protocolPayload)
    
    cb event, payload, req, res, protocolPayload, responseObj


  # Metadata
  namespace: 'draganddrop'
  packageType: 'content-type'
  installedContentPackages: []

  meta: {
    'name': 'draganddrop',
    'shortDescription': 'Content type for drag-and-drop exercises.',
    'description': 'Content type for drag-and-drop exercises.',
    'author': 'Markku Riekkinen',
    'license': 'MIT',
    'version': '0.2.0',
    'url': ''
  }


module.exports = Draganddrop
