class DragAndDrop extends DragAndDropBase
  @pluginName = 'acosDragAndDrop'

  @defaults: $.extend {}, DragAndDropBase.defaults,
    points_selector: '.draganddrop-points'
    correct_answers_selector: '.draganddrop-correct-answers'
    wrong_answers_selector: '.draganddrop-wrong-answers'
    completed_selector: '.draganddrop-complete'
    draggable_selector: '.draggable'
    draggable_class: 'draggable'
    draggables_selector: '.draganddrop-draggables'
    draggables_container_class: 'draganddrop-draggables'
    complete_msg_attr: 'data-msg-complete'
    complete_uploading_msg_attr: 'data-msg-complete-uploading'
    complete_uploaded_msg_attr: 'data-msg-complete-uploaded'
    complete_error_msg_attr: 'data-msg-complete-error'
    completed_msg_selector: '.draganddrop-complete-msg'
    final_comment_selector: '.draganddrop-finalcomment'
    final_points_msg_attr: 'data-msg-final'
    drags_left_msg_selector: '.draganddrop-dragsleftmsg'
    drags_left_singular_msg_attr: 'data-msg-singular'
    drags_left_plural_msg_attr: 'data-msg-plural'
    quit_button_selector: '[data-quit-button]'

  constructor: (element, options) ->
    super(element, options)
    @completed = false
    # answers made to each droppable (no duplicates even if the same answer is repeated) (key: droppable unique id)
    @questionAnswered = {}
    @pointsDiv = @element.find(@settings.points_selector)
    @completeDiv = @element.find(@settings.completed_selector)
    @completeMsg = @element.find(@settings.completed_msg_selector)
    @finalComment = @element.find(@settings.final_comment_selector)
    @correctPointsElem = @element.find(@settings.correct_answers_selector)
    @wrongPointsElem = @element.find(@settings.wrong_answers_selector)
    @dragsLeftMsgDiv = @element.find(@settings.drags_left_msg_selector)
    @draggablesContainer = null
    @quitButton = @element.find(@settings.quit_button_selector)
    @correctAnswers = 0
    @incorrectAnswers = 0
    @maxCorrectAnswers = @element.find(@settings.droppable_selector).length
    # total correct answers in the exercise
    @answerLog = [] # all answers (drags) for logging
    @dragData = null # drag data stored here in case the native API hides it
    # the selected draggable for making answers by clicking
    @selectedDrag = null
    @init()

  init: ->
    self = this
    @initDraggables()
    idCounter = 0
    # attach event handlers to the draggable and droppable elements in the exercise as well as
    # generate and add unique IDs to the droppable elements
    @element.find(@settings.droppable_selector).each ->
      uniqueId = idCounter++
      $(this).data 'id', uniqueId
      questionLabel = $(this).data('label')
      # labels are set by the teacher, they may repeat the same values
      if Array.isArray(self.droppablesByLabel[questionLabel])
        self.droppablesByLabel[questionLabel].push uniqueId
      else
        self.droppablesByLabel[questionLabel] = [uniqueId]
      self.questionAnswered[uniqueId] = []
      # the array will contain the draggable labels corresponding to answers made by the user
      # on this droppable (no duplicate values are added to the array)
      self.latestAnswers[uniqueId] = null
      # latest answer (draggable label) on this droppable
      self.origDropContents[uniqueId] = $(this).html()
      return
    .on 'dragover', (e) ->
      self.handleDragOver e, $(this)
    .on 'dragenter', (e) ->
      self.handleDragEnter e, $(this)
    .on 'dragleave', (e) ->
      self.handleDragLeave e, $(this)
    .on 'drop', (e) ->
      self.handleDrop e, $(this)
    .on 'click', (e) ->
      # show feedback again for this droppable
      # or make answers by clicking
      self.handleDroppableClick e, $(this)

    # Note about event handlers: this is the element which the handler is attached to,
    # while event.target may be a child element.
    @draggablesContainer.find(@settings.draggable_selector).on 'dragstart', (e) ->
      self.handleDragStart e, $(this)
    .on 'dragend', (e) ->
      self.handleDragEnd e, $(this)
    .on 'click', (e) ->
      self.handleDraggableClick e, $(this)

    @quitButton.click ->
      # submit the unfinished solution, that is to say, the user has not found
      # all correct answers yet, but wants to quit and receive a grade anyway
      self.completeExercise(true)
      return

    # use fixed positioning for the info and draggables containers
    # if they cannot be seen on the screen otherwise
    @setInfoPosition()
    @setDraggablesPosition()
    $(window).on 'resize', ->
      self.setInfoPosition()
      self.setDraggablesPosition()

  initDraggables: ->
    # create the draggables container
    @draggablesContainer = @contentDiv.find(@settings.draggables_selector).empty()
    if not @draggablesContainer.length
      # add the draggables container to the default location
      @draggablesContainer = $('<div></div>')
        .addClass @settings.draggables_container_class
        .prependTo @element
    else if @draggablesContainer.hasClass('vertical')
      @element.addClass(
        if @draggablesContainer.hasClass('right') then 'vertical-right-draggables'
        else 'vertical-draggables'
      )

    # create draggable elements based on payload data
    for own id, pl of @draggablesPayload
      text = pl.content
      customClass = pl.htmlclass
      dragElem = $('<span>')
      dragElem
        .addClass(@settings.draggable_class)
        .attr('data-label', id)
        .attr('draggable', 'true')
        .html(text)
        .appendTo @draggablesContainer
      if customClass
        # set custom class to the draggable element, if the payload defines it
        # multiple classes may be given in one space-separated string
        dragElem.addClass customClass

  handleDragStart: (e, dragElem) ->
    e.originalEvent.dataTransfer.effectAllowed = 'copy'
    e.originalEvent.dataTransfer.dropEffect = 'copy'
    # if <img> is used in the draggable, set it to the drag image so that
    # the drag image never includes the draggable box by default, only the image
    draggableImg = dragElem.find('img')
    if draggableImg.length
      img = draggableImg.get(0)
      try
        e.originalEvent.dataTransfer.setDragImage img, img.width / 2, 0
      catch ex
        # ignore, some browsers do not support setting the drag image
    dragElem.css 'opacity', '0.5'
    dragData = dragElem.data('label')
    try
      e.originalEvent.dataTransfer.setData 'text/plain', dragData
    catch ex
      # Internet Explorer does not support the "text/plain" data type
      e.originalEvent.dataTransfer.setData 'text', dragData
    @dragData = dragData
    # keep the data in a variable since the drag-and-drop API is unreliable
    return

  handleDragOver: (e, dropElem) ->
    draggableLabel = null
    try
      draggableLabel = e.originalEvent.dataTransfer.getData('text/plain')
    catch ex
      # for Internet Explorer
      draggableLabel = e.originalEvent.dataTransfer.getData('text')
    if not draggableLabel
      # fallback when the native API fails
      draggableLabel = @dragData
    if draggableLabel and @draggablesPayload[draggableLabel] and not dropElem.hasClass('correct')
      e.preventDefault()
      # allow drop
      e.originalEvent.dataTransfer.dropEffect = 'copy'
      return false
    true

  handleDragEnter: (e, dropElem) ->
    e.preventDefault() # really needed?
    if not dropElem.hasClass('correct')
      # the droppable has not been correctly answered yet so add a class for styling while hovering over it
      dropElem.addClass 'over'
    return

  handleDragLeave: (e, dropElem) ->
    dropElem.removeClass 'over'
    return

  handleDrop: (e, dropElem) ->
    e.stopPropagation()
    # stops the browser from redirecting
    e.preventDefault()
    draggableLabel = null
    try
      draggableLabel = e.originalEvent.dataTransfer.getData('text/plain')
    catch ex
      # for Internet Explorer
      draggableLabel = e.originalEvent.dataTransfer.getData('text')
    if not draggableLabel
      # fallback when the native API fails
      draggableLabel = @dragData
    droppableLabel = dropElem.data('label')
    @checkAnswer draggableLabel, droppableLabel, dropElem
    false

  handleDragEnd: (e, dragElem) ->
    dragElem.css 'opacity', ''
    # remove the inline style set in dragstart
    @element.find(@settings.droppable_selector).removeClass 'over'
    @dragData = null
    if @completed
      # if the exercise has been completed, detach the drag event handlers
      # do it here so that the drag event for the last answer may finish normally
      @detachDragEventHandlers()
    return

  handleDroppableClick: (e, dropElem) ->
    e.stopPropagation()
    e.preventDefault()
    dropId = dropElem.data('id')
    answers = @questionAnswered[dropId]
    if answers.length < 1 and not @selectedDrag
      # not answered yet and not answering by clicking, do nothing
      return false

    droppableLabel = dropElem.data 'label'
    if @selectedDrag and not dropElem.hasClass 'correct'
      # answer by clicking
      draggableLabel = @selectedDrag.data 'label'
      @checkAnswer draggableLabel, droppableLabel, dropElem
      if @completed
        # if the exercise has been completed, detach the drag event handlers
        # this can not be done inside checkAnswer since it would break
        # the ongoing drag event when the user answers by dragging
        @detachDragEventHandlers()
    else
      # show feedback of the latest answer in this droppable
      draggableLabel = @latestAnswers[dropId]
      feedback = @getFeedback(draggableLabel, droppableLabel, dropId)
      @updateFeedback feedback, @isCorrectAnswer(draggableLabel, droppableLabel)
      if not @completed
        # Log this click event (which shows that the learner wanted to study the feedback again).
        # The log event is sent when the exercise is completed and thus
        # it is unnecessary to keep track of clicks after that.
        logPayload =
          qid: dropId
          qlabel: droppableLabel
          alabel: draggableLabel
          time: (new Date).toISOString()
          click: true
        @answerLog.push logPayload
    false

  handleDraggableClick: (e, dragElem) ->
    # select a draggable for answering by clicking
    if dragElem.is(@selectedDrag)
      # clicked the same draggable again, deselect it
      @selectedDrag.removeClass 'selected'
      @selectedDrag = null
    else
      # clear the previous selection first
      @selectedDrag.removeClass('selected') if @selectedDrag
      @selectedDrag = dragElem
      @selectedDrag.addClass 'selected'

  checkAnswer: (draggableLabel, droppableLabel, droppableElem) ->
    # if the exercise has been completed or
    # if the correct answer has been given for this droppable, ignore the drag event
    if @completed or droppableElem.hasClass('correct')
      return
    dropId = droppableElem.data('id')
    @latestAnswers[dropId] = draggableLabel
    # Has the draggable already been dragged on the droppable previously?
    # It is possible to repeat the same wrong answer before the correct answer is found,
    # but repeating the same wrong answer does not affect grading.
    wasAnswered = true
    if @questionAnswered[dropId].indexOf(draggableLabel) == -1
      @questionAnswered[dropId].push draggableLabel
      wasAnswered = false
    dragPayload = @draggablesPayload[draggableLabel]
    #dropPayload = @droppablesPayload[droppableLabel]
    isCorrect = @isCorrectAnswer(draggableLabel, droppableLabel)
    feedback = @getFeedback(draggableLabel, droppableLabel, dropId)
    @updateFeedback feedback, isCorrect
    droppableElem.removeClass 'correct wrong'
    if isCorrect
      droppableElem.addClass 'correct'
      if dragPayload.htmlclass
        droppableElem.addClass dragPayload.htmlclass
      if not wasAnswered
        @correctAnswers++
      # if the same draggable should not be reused after finding the correct droppable for it (default: allow reuse)
      if dragPayload.reuse == false
        @disableDraggable draggableLabel
    else
      droppableElem.addClass 'wrong'
      if not wasAnswered
        @incorrectAnswers++
    # reveal text defined by the draggable in the droppable
    @revealAnswerInDroppable draggableLabel, droppableElem, isCorrect
    @updatePoints()
    @updateCorrectDragsLeftMessage()
    # save the answer for logging (even if the same answer had already been made
    # since it may be useful data)
    # the full log is uploaded to the ACOS server at the end
    # with the label a log analyzer can check if the answer was correct or not
    # (exercise JSON payload has the same labels)
    # droppable IDs are unique, labels may be reused
    # the aplus protocol adds a user id to the payload
    logPayload = 
      qid: dropId
      qlabel: droppableLabel
      alabel: draggableLabel
      time: (new Date).toISOString()
    if wasAnswered
      # this answer had already been made previously
      logPayload.rerun = true
    @answerLog.push logPayload

    # the quit button is active after the first answer until the exercise is completed
    @quitButton.prop('disabled', false)
    @checkCompletion()
    return

  checkCompletion: ->
    @completeExercise(false) if @correctAnswers >= @maxCorrectAnswers
    return

  completeExercise: (unfinished = false) ->
    return if @completed
    @completed = true
    @quitButton.prop('disabled', true)
    @dragsLeftMsgDiv.hide() unless unfinished
    # drag event handlers are detached here for unfinished submissions and
    # in the dragend event handler for normal submissions
    @detachDragEventHandlers() if unfinished
    @completeMsg.text @completeDiv.attr(@settings.complete_msg_attr)
    @completeDiv.removeClass('hide').show()
    @grade()
    @sendLog()

  grade: ->
    self = this
    if window.location.pathname.substring(0, 6) != '/html/'
      # hide this uploading message when acos html protocol is used since it does not store any grading
      @completeMsg.text @completeDiv.attr(@settings.complete_uploading_msg_attr)

    # add a penalty if the exercise is submitted in an unfinished state (not all correct answers found)
    penalty = 3 * (@maxCorrectAnswers - @correctAnswers)
    scorePercentage = Math.round(@maxCorrectAnswers / (@correctAnswers + @incorrectAnswers + penalty) * 100)
    # show final points
    @addFinalPointsString @pointsDiv, scorePercentage
    # final comment may be defined in the exercise payload and depends on the final points
    @showFinalComment scorePercentage
    # feedback for the grading event that is sent to the server
    feedback = @buildFinalFeedback()
    if window.ACOS
      # set max points to 100 since the points are given as a percentage 0-100%
      window.ACOS.sendEvent 'grade', {
        max_points: 100
        points: scorePercentage
        feedback: feedback
      }, (content, error) ->
        if error
          # error in uploading the grading result to the server, show a message to the user
          self.completeMsg.text self.completeDiv.attr(self.settings.complete_error_msg_attr) + error.error
          return
        # the grading result has been sent to the server
        if window.location.pathname.substring(0, 6) != '/html/'
          # hide this uploading message when acos html protocol is used since it does not store any grading
          self.completeMsg.text self.completeDiv.attr(self.settings.complete_uploaded_msg_attr)
        return
    return

  sendLog: ->
    if window.ACOS
      window.ACOS.sendEvent 'log', @answerLog
    return

  disableDraggable: (draggableLabel) ->
    dragElem = @draggablesContainer.find(@settings.draggable_selector + '[data-label="' + draggableLabel + '"]')
    dragElem.attr('draggable', 'false')
      .addClass('disabled')
      .removeClass('selected')
      .off('click')
    @selectedDrag = null if dragElem.is(@selectedDrag)
    # if the draggable contains <img> or <a> elements, they are draggable by default
    # and dragging must be disabled separately
    dragElem.find('img, a').attr 'draggable', 'false'
    return

  updatePoints: ->
    @correctPointsElem.text @correctAnswers
    @wrongPointsElem.text @incorrectAnswers
    @pointsDiv.removeClass('hide').show()
    return

  updateCorrectDragsLeftMessage: ->
    if @correctAnswers >= 0.5 * @maxCorrectAnswers
      left = @maxCorrectAnswers - @correctAnswers
      # how many correct answers left
      msgAttr = if left == 1 then @settings.drags_left_singular_msg_attr else @settings.drags_left_plural_msg_attr
      msg = @dragsLeftMsgDiv.attr(msgAttr)
      msg = msg.replace('{counter}', left.toString())
      @dragsLeftMsgDiv.html msg
      @dragsLeftMsgDiv.removeClass('hide').show()
    return

  showFinalComment: (score) ->
    payload = window.draganddrop.finalcomment
    if not payload
      return
    html = ''
    if payload.common
      # always show this comment
      html += payload.common + '<br>'

    limits = []
    # convert limits to numbers so that they may be compared
    for own key, v of payload
      limit = parseInt(key, 10)
      if not isNaN(limit)
        limits.push [limit, key]

    limits.sort (a, b) ->
      if a[0] < b[0]
        -1
      else if a[0] > b[0]
        1
      else
        0

    feedbackIdx = limits.findIndex (elem) ->
      score <= elem[0]
    html += payload[limits[feedbackIdx][1]] if feedbackIdx != -1
    @finalComment.html html
    @finalComment.removeClass('hide').show()
    return

  detachDragEventHandlers: ->
    @element.find(@settings.droppable_selector).off 'dragover dragenter dragleave drag'
    @draggablesContainer
      .find(@settings.draggable_selector)
      .off('dragstart dragend click')
      .attr('draggable', 'false')
      .addClass 'finished'
    if @selectedDrag
      @selectedDrag.removeClass 'selected'
      @selectedDrag = null
    return

  addFinalPointsString: (pointsElem, scorePercentage) ->
    # string to format, fill in score
    finalPointsStr = pointsElem.attr(@settings.final_points_msg_attr)
    finalPointsStr = finalPointsStr.replace('{score}', scorePercentage.toString())
    # prepend the final score HTML to the points element
    pointsElem.prepend finalPointsStr
    return

  setDraggablesPosition: ->
    # disable this method when the draggables container is vertical
    return if @draggablesContainer.hasClass('vertical')
    # make the draggables container fixed if it cannot be seen: the window is too small
    # to fit everything on the screen at once
    if $(window).height() * 0.8 > @contentDiv.height()
      # exercise content fits easily in the window
      # use normal positioning for the draggables container
      @draggablesContainer.removeClass 'fixed'
      @contentDiv.removeClass 'fixed-draggables'
      @draggablesContainer.css 'maxHeight', $(window).height() * 0.25
      # max height prevents the draggables container from becoming massive if there are many draggables
      @contentDiv.css 'marginTop', ''
      # remove css property
    else
      # exercise content takes most space in the window or does not fit in:
      # use fixed positioning for the draggables container to keep it visible on the screen
      @draggablesContainer.addClass 'fixed'
      @contentDiv.addClass 'fixed-draggables'
      @draggablesContainer.css 'maxHeight', ''
      # remove maxHeight to measure real height
      h = Math.min(@draggablesContainer.height(), $(window).height() * 0.25)
      @draggablesContainer.css 'maxHeight', h
      @contentDiv.css 'marginTop', h
    return

  buildFinalFeedback: ->
    # let the server backend create the HTML of the final feedback
    # only upload the submission data here (what the student answered in each droppable)
    # if the frontend JS could post feedback HTML to the server, a malicious user could
    # inject scripts that create XSS vulnerabilities in the frontend learning management system
    {
      answers: @questionAnswered
      correctAnswers: @correctAnswers
      incorrectAnswers: @incorrectAnswers
    }


# attach a method to jQuery objects that initializes drag-and-drop exercise
# in the elements matched by the jQuery object
$.fn[DragAndDrop.pluginName] = (options) ->
  @each ->
    if not $.data(this, 'plugin_' + DragAndDrop.pluginName)
      $.data this, 'plugin_' + DragAndDrop.pluginName, new DragAndDrop(this, options)
    return

# initialize on page load
$ ->
  $('.draganddrop').acosDragAndDrop()

