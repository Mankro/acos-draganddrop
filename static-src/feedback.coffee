###
Drag-and-drop final feedback (in A+, it is shown on a separate submission page)
This script enables event handlers in the final feedback: the feedback for each
droppable is shown when the user clicks on the element. If the student answered
a droppable with multiple draggables (some of them must have been incorrect),
a select menu is added after each droppable as well so that the user may view
feedback for the other answers.
This final feedback page is not used to make new submissions to the exercise;
it only shows the state of a previous submission.
###
class DragAndDropFeedback extends DragAndDropBase
  @pluginName = 'acosDragAndDropFeedback'

  constructor: (element, options) ->
    super(element, options)
    @questionAnswered = window.draganddrop.answers # answers to each droppable (key: droppable unique id)
    [payloadOk, err] = @checkPayloadSanity()
    if not payloadOk
      console.error 'Error in initialization, aborting: ' + err
      return
    @init()

  checkPayloadSanity: () ->
    allDefined = [@draggablesPayload, @droppablesPayload, @questionAnswered].every((x) -> x?)
    return [false, 'Feedback payload is missing!'] unless allDefined
    if typeof @questionAnswered != 'object' or Array.isArray(@questionAnswered)
      # arrays have type "object" too
      [false, 'Feedback payload has the wrong type!']
    else
      for own id, answers of @questionAnswered
        return [false, 'Feedback payload is invalid!'] unless Array.isArray answers
      [true, '']

  init: ->
    self = this
    idCounter = 0
    @element.find(@settings.droppable_selector).each ->
      uniqueId = idCounter++
      $(this).data 'id', uniqueId
      questionLabel = $(this).data('label')
      # labels are set by the teacher, they may repeat the same values
      if Array.isArray(self.droppablesByLabel[questionLabel])
        self.droppablesByLabel[questionLabel].push uniqueId
      else
        self.droppablesByLabel[questionLabel] = [uniqueId]
      self.origDropContents[uniqueId] = $(this).html()
      # initialize the latestAnswers variable (the latest answers in the submission,
      # the variable will then keep track of the latest selected answer)
      answers = self.questionAnswered[uniqueId]
      draggableLabel = undefined
      if answers and answers.length > 0
        draggableLabel = answers[answers.length - 1]
      else
        return true
        # no answers set, continue to the next element in iteration
      self.latestAnswers[uniqueId] = draggableLabel
      droppableElem = $(this)
      isCorrect = self.isCorrectAnswer(draggableLabel, questionLabel)
      # set the reveal effect of the latest answer inside the droppable element
      self.revealAnswerInDroppable draggableLabel, droppableElem, isCorrect
      # set correct or wrong style
      if isCorrect
        droppableElem.addClass 'correct'
        dragPayload = self.draggablesPayload[draggableLabel]
        if dragPayload.htmlclass
          droppableElem.addClass dragPayload.htmlclass
      else
        droppableElem.addClass 'wrong'
      # create the select menu for showing the feedback of other answers for this droppable
      if answers.length > 1
        answerSelect = $('<select>')
        for i in [0...answers.length]
          draggableText = self.constructor.getTextContent(self.draggablesPayload[answers[i]].content, answers[i])
          opt = $('<option>')
          opt.attr('value', answers[i]).text draggableText
          # the last one is initially selected
          opt.prop('selected', true) if i == answers.length - 1
          opt.appendTo answerSelect
        # insert the select menu into the DOM after the droppable
        droppableElem.after answerSelect
        # event handler when the user selects something
        answerSelect.change ->
          # remove extra HTML classes from the droppable that were based on the previous answer
          previousAnswer = self.latestAnswers[uniqueId]
          prevDragPayload = self.draggablesPayload[previousAnswer]
          if prevDragPayload.htmlclass
            droppableElem.removeClass prevDragPayload.htmlclass
          dragLabel = answerSelect.val()
          self.latestAnswers[uniqueId] = dragLabel
          self.showFeedback dragLabel, droppableElem
      return
    .click (ev) ->
      # If no other answer has been selected yet, show feedback for the last answer to this droppable.
      # Otherwise, show the most recently selected answer.
      droppableElem = $(this)
      uniqueId = droppableElem.data('id')
      draggableLabel = self.latestAnswers[uniqueId]
      self.showFeedback draggableLabel, droppableElem
      return
    # the info/feedback box switches between normal and fixed positioning so that
    # it is always easily readable
    @setInfoPosition()
    $(window).on 'resize', ->
      self.setInfoPosition()
    return

  showFeedback: (draggableLabel, droppableElem) ->
    if not draggableLabel
      @feedbackDiv.text '[Error: answer not set]'
      return
    droppableLabel = droppableElem.data('label')
    if not @droppablesPayload[droppableLabel] or not @draggablesPayload[draggableLabel]
      @feedbackDiv.text '[Error: payload not set]'
      return
    # Update styles
    isCorrect = @isCorrectAnswer(draggableLabel, droppableLabel)
    feedback = @getFeedback(draggableLabel, droppableLabel, droppableElem.data('id'))
    @updateFeedback feedback, isCorrect
    droppableElem.removeClass 'correct wrong'
    if isCorrect
      droppableElem.addClass 'correct'
      dragPayload = @draggablesPayload[draggableLabel]
      droppableElem.addClass(dragPayload.htmlclass) if dragPayload.htmlclass
    else
      droppableElem.addClass 'wrong'
    # reveal text defined by the draggable in the droppable
    @revealAnswerInDroppable draggableLabel, droppableElem, isCorrect
    return

  @stripHTML: (htmlString) ->
    # must wrap the argument string inside a new element so that we can get the whole text content
    $('<div>').html(htmlString).text().trim()

  @getTextContent: (htmlString, label) ->
    return label unless htmlString
    text = DragAndDropFeedback.stripHTML(htmlString)
    return text if text
    # text content of the draggable is empty, let's see if there is an <img>
    nodes = $.parseHTML(htmlString)
    img = null
    for node in nodes
      if node.nodeName.toUpperCase() == 'IMG'
        img = $(node)
        break
    # use the label since we cannot get any text from the HTML
    return label unless img
    alt = img.attr('alt')?.trim()
    # check the alt attr of the img
    return alt if alt
    # try reading a filename from the img src URL
    src = img.attr('src')
    if src
      # take the last part of the URL (after the last /) and assume it is a filename of the image
      # works if src has no / since lastIndexOf returns -1 then
      return src.substring(src.lastIndexOf('/') + 1)
    label


# attach a method to jQuery objects that initializes drag-and-drop feedback
# in the elements matched by the jQuery object
$.fn[DragAndDropFeedback.pluginName] = (options) ->
  @each ->
    if not $.data(this, 'plugin_' + DragAndDropFeedback.pluginName)
      $.data this, 'plugin_' + DragAndDropFeedback.pluginName, new DragAndDropFeedback(this, options)
    return

# initialize on page load
$ ->
  $('.draganddrop').acosDragAndDropFeedback()

