class DragAndDropBase
  @defaults:
    feedback_selector: '.draganddrop-feedback'
    droppable_selector: '.droppable'
    content_selector: '.draganddrop-content'
    info_selector: '.draganddrop-info'

  constructor: (element, options) ->
    @element = $(element)
    @settings = $.extend({}, @constructor.defaults, options)

    @draggablesPayload = window.draganddrop.draggables
    @droppablesPayload = window.draganddrop.droppables
    @latestAnswers = {} # latest answer for each droppable (key: droppable unique id)
    @droppablesByLabel = {} # array of droppable unique ids for each droppable label (key: droppable label)
    @origDropContents = {} # original HTML contents of the droppables (key: droppable unique id)
    @contentDiv = @element.find(@settings.content_selector)
    @feedbackDiv = @element.find(@settings.feedback_selector)
    @infoDiv = @element.find(@settings.info_selector)

  getFeedback: (draggableLabel, droppableLabel, droppableId) ->
    feedback = undefined
    dropPl = @droppablesPayload[droppableLabel]
    dragPl = @draggablesPayload[draggableLabel]
    if dropPl.feedback and dropPl.feedback[draggableLabel]
      feedback = dropPl.feedback[draggableLabel]
    else if dragPl.feedback and dragPl.feedback[droppableLabel]
      feedback = dragPl.feedback[droppableLabel]
    else if dropPl.feedback and dropPl.feedback.DEFAULT
      feedback = dropPl.feedback.DEFAULT
    else if dragPl.feedback and dragPl.feedback.DEFAULT
      feedback = dragPl.feedback.DEFAULT
    else
      feedback = '[ERROR: no feedback set]'
    # check combined feedback and add it if necessary
    feedback += @getComboFeedback(draggableLabel, droppableLabel, droppableId, true)
    feedback

  getComboFeedback: (draggableLabel, droppableLabel, droppableId, inHtml) ->
    # inHtml: if true or undefined, return combined feedback as an HTML string.
    # If false, return an array of strings (based on the payload, so they may have HTML formatting).
    if not window.draganddrop.combinedfeedback
      # no combined feedback in the exercise
      return if inHtml == false then [] else ''
    feedback = []
    len = window.draganddrop.combinedfeedback.length
    # loop over all combined feedback and for each combination, check if the conditions are fulfilled
    for comboObj in window.draganddrop.combinedfeedback
      continue unless comboObj.combo and comboObj.feedback
      comboFulfilled = true
      # are all conditions (pairs) satisfied?
      currentAnswerInCombo = false
      # useDropId: if true, second part of the combo pair is a droppable unique id, not label
      useDropId = comboObj.useDroppableId == true
      # loop over the answers (draggable-droppable pairs) in the combo:
      # each pair must be satisfied in order to fulfill the combo
      for pair in comboObj.combo
        # pair: draggable label, droppable label/id
        # Check if the current answer is part of the combo
        # (one pair must match with the current answer): if not, the combo is not triggered.
        if (not currentAnswerInCombo and pair[0] == draggableLabel and
           (not useDropId and pair[1] == droppableLabel or
            useDropId and pair[1] == droppableId))
          currentAnswerInCombo = true
        # check if this pair is satisfied, i.e., the latest answer in the droppable is the draggable given in the pair
        pairSatisfied = false
        if useDropId
          if @latestAnswers[pair[1]] == pair[0]
            pairSatisfied = true
        else
          # droppables may reuse the same label, hence all of those droppables must be
          # checked to see if their answer is part of the combo
          for dropId in @droppablesByLabel[pair[1]]
            if @latestAnswers[dropId] == pair[0]
              pairSatisfied = true
              break
        if not pairSatisfied
          # this combo is not fulfilled since this pair is missing
          comboFulfilled = false
          break

      # are the conditions for this combined feedback fulfilled?
      if comboObj.combo.length > 0 and comboFulfilled and currentAnswerInCombo
        feedback.push comboObj.feedback

    if inHtml == false
      feedback
    else
      html = ''
      for fb in feedback
        html += '<br>' + '<span class="draganddrop-combinedfeedback">' + fb + '</span>'
      html

  isCorrectAnswer: (draggableLabel, droppableLabel) ->
    dropPayload = @droppablesPayload[droppableLabel]
    isCorrect = false
    if Array.isArray(dropPayload.correct)
      if dropPayload.correct.indexOf(draggableLabel) != -1
        # is the draggableLabel in the array of expected correct draggables?
        isCorrect = true
    else
      if dropPayload.correct == draggableLabel
        isCorrect = true
    isCorrect

  updateFeedback: (feedback, isCorrect) ->
    @feedbackDiv.html(feedback).removeClass 'correct wrong'
    if isCorrect
      @feedbackDiv.addClass 'correct'
    else
      @feedbackDiv.addClass 'wrong'
    return

  revealAnswerInDroppable: (draggableLabel, droppableElem, isCorrect) ->
    dropId = droppableElem.data('id')
    dragPayload = @draggablesPayload[draggableLabel]
    dropPayload = @droppablesPayload[droppableElem.data('label').toString()]
    # if the reveal value is not defined in the payload,
    # the default action is to replace the droppable content with the draggable content
    # If the droppable payload defines a reveal effect that applies to the current answer,
    # the reveal effect defined in the draggable payload is ignored.
    disableReveal = false
    if !dropPayload.revealCorrect? and isCorrect or !dropPayload.revealWrong? and not isCorrect
      if (dragPayload.reveal == false or
          dragPayload.revealCorrect == false and isCorrect or
          dragPayload.revealWrong == false and not isCorrect)
        disableReveal = true
    else
      if (dropPayload.revealCorrect == false and isCorrect or
          dropPayload.revealWrong == false and not isCorrect)
        disableReveal = true
    if disableReveal
      # if the reveal value is set to false in the payload,
      # do not reveal anything and keep the droppable text intact
      # The original content is set back here incase other answers have replaced
      # the droppable content with something else.
      droppableElem.html @origDropContents[dropId]
      return

    # helper function for reading different types of reveal effects from the payload
    getRevealValues = (obj, arr) ->
      keys = ['replace', 'append', 'prepend']
      for i in [0...keys.length]
        arr[i] = obj[keys[i]] if obj.hasOwnProperty(keys[i])
      return

    replace = false
    append = false
    prepend = false
    revealArray = [replace, append, prepend]
    useDefault = false

    ### The reveal effects may be defined either in the droppable payload or in
    the draggable payload. The droppable payload supports revealCorrect and revealWrong
    fields, while the draggable payload additionally supports reveal (that affects
    all cases). The reveal effects in the droppable are used with the first priority
    if they are defined and apply to the situation (correct or incorrect answer).

    The draggable paylod may define the same reveal effects for both correct and
    incorrect answers, or separately for correct and incorrect answers. If the shared
    reveal effect is defined (field reveal), it is always used and the others are
    ignored (fields revealCorrect and revealWrong). Any kind of reveal is an object
    in the payload with one of the keys defined: replace, append, or prepend.
    ###

    if dropPayload.revealCorrect and isCorrect
      getRevealValues dropPayload.revealCorrect, revealArray
    else if dropPayload.revealWrong and not isCorrect
      getRevealValues dropPayload.revealWrong, revealArray
    else if dragPayload.reveal
      getRevealValues dragPayload.reveal, revealArray
    else if dragPayload.revealCorrect and isCorrect
      getRevealValues dragPayload.revealCorrect, revealArray
    else if dragPayload.revealWrong and not isCorrect
      getRevealValues dragPayload.revealWrong, revealArray
    else
      # use default behaviour: replace with the draggable content
      useDefault = true

    if useDefault
      replace = dragPayload.content
    else
      replace = revealArray[0]
      # the content that replaces the old one
      append = revealArray[1]
      prepend = revealArray[2]

    prependWrap = ''
    replaceWrap = ''
    appendWrap = ''
    # nested <span> elements are used to hack with pointer events in the drag-and-drop API
    # and they are also used to separate the prepend and append reveal values
    # from the other droppable content
    if replace
      replaceWrap = '<span>' + replace + '</span>'
    else
      replaceWrap = @origDropContents[dropId]
    if append
      appendWrap = '<span class="small drop-reveal"> [' + append + ']</span>'
    if prepend
      prependWrap = '<span class="small drop-reveal">[' + prepend + '] </span>'
    droppableElem.html prependWrap + replaceWrap + appendWrap
    return

  setInfoPosition: ->
    if $(window).height() * 0.8 > @contentDiv.height()
      # exercise content fits easily in the window
      # use normal positioning for the info box
      @infoDiv.removeClass 'fixed'
      @contentDiv.removeClass 'fixed-info'
      @infoDiv.css 'maxHeight', ''
      # remove css property
      @contentDiv.css 'marginBottom', ''
    else
      # exercise content takes most space in the window or does not fit in:
      # use fixed positioning for the info box to keep it visible on the screen
      @infoDiv.addClass 'fixed'
      @contentDiv.addClass 'fixed-info'
      h = $(window).height() * 0.25
      @infoDiv.css 'maxHeight', h
      @contentDiv.css 'marginBottom', h
    return

