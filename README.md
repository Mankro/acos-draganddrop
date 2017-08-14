# Drag-and-drop exercises

This content type for the Acos server is especially designed for language learning.

To create your own exercises (in a new content package), copy the following files from the `draganddrop-example` content package:
* package.json (modify the name and description fields)
* index.coffee (edit metadata, leave everything else untouched)

Any XML files in the `exercises` directory of the content package are recognized as exercises. 
The files may be nested in subdirectories under the `exercises` directory. 
The names of the XML files MUST NOT use any hyphens (`-`). Spaces in the filenames are not recommended. 
Look at `short.xml` and `short.json` for a very simple example of an exercise. 
Note that the ACOS server must be restarted after adding new exercises.

You must specify content (correct answers, feedback, etc.) by providing a hand-written JSON file.
The JSON file must be placed in the same directory as the exercise XML file and named similarly to the XML file
(e.g., exercise1.xml goes with exercise1.json).

This content type uses CoffeeScript. The easiest way to make it work is to install 
CoffeeScript either globally or in the `acos-server` directory (`npm install coffeescript`) 
and to ensure that the `acos-server` automatically recognizes `.coffee` files. That is 
achieved by adding a line to the start of the `acos-server/app.js` file: 
`require('coffee-script/register');`. Alternatively, the CoffeeScript code could be 
compiled to JavaScript so that the deployment server does not require CoffeeScript at all.

# Notation

The content of the XML file is either an HTML fragment or a complete HTML document.
It is parsed with an XML parser, hence it should be syntactically correct XML as well.
The content must be wrapped in a single element. The following structure is valid:
```html
<html>
  <head>
    Head is optional.
  </head>
  <body>
    content...
  </body>
</html>
```

You can also omit the html and body tags and wrap the content in a div (or any other element).
```html
<div>
  content...
</div>
```

The following is INVALID because the entire content is not wrapped in a single element:
```html
<p>Some content</p>
<p>Some more content</p>
```


## Droppable areas (holes into which draggables may be dropped)

Droppable areas are defined in the exercise XML file with curly brackets: `{1: drop onto this}`.
They include a label to the JSON data (a string of ASCII characters, in the previous example `1`) and
the content of the droppable (in the previous example `drop onto this`). The label and the content
are separated by a colon `:`. The content may be empty (`{label:}`). The content of the droppable
is rendered in the exercise page to users while the label is only used to connect the droppable
to the correct JSON definition. The same droppable label may be used multiple times in
different holes if the droppables should use the same correct answers and the feedback.
The label `DEFAULT` may not be used as it is reserved for special use.

```html
<h1>Simple example</h1>
<p>
  Drop something here: {mylabel:}.
  You may drag-and-drop onto {ontext: the rest of this sentence}.
  We can reuse the droppable label: {mylabel: the droppable content may differ}.
</p>
```


## Draggable elements

The draggable elements, basically answers to the questions that are represented as
droppable areas in the exercise, are defined in the JSON file. The JSON defines
the content that is rendered for the draggable in the exercise page, whether
the draggable may be reused after the student has dragged it into a correct
droppable once, and what is revealed in the droppable when the draggable is dragged
there. Additionally, feedback for each draggable-droppable pair may be defined under
draggables in the JSON, but the feedback may also be defined under droppables.
The number of available draggables need not match the number
of droppables, i.e., some draggables could be incorrect to all droppables or
some draggables could be the answer to multiple droppables.

Example JSON:
```json
{
  "draggables": {
    "draglabel1": {
      "content": "&empty;",
      "feedback": {
        "droppablelabel1": "<b>Correct</b>, well done! This hole should be left empty.",
        "droppablelabel2": "Wrong! This can not be used here.",
        "droppablelabel3": "This is never used since this value is overridden in the droppables section",
        "DEFAULT": "If no more specific feedback was defined, this is used.",
      },
      "reuse": false,
      "reveal": {
        "replace": "Droppable content is replaced with this text (normally you would define only one of these reveal options)",
        "append": "This new text is appended to the droppable content (with a different font to stand out)",
        "prepend": "Like append, but prepend to the droppable content",
      },
    },
    "draglabel2": {
      "content": "the"
    },
    "draglabel3": {
      "content": "a"
    }
  },
  "droppables": {
    ...
  }
}
```

The exercise JSON must define an object with keys `draggables` and `droppables`.
The `draggables` object defines configuration for each draggable label (`draglabel1` etc.).
The labels may be chosen freely (ASCII characters) and they are also needed
in the droppables section in the JSON file. The labels are not rendered in the exercise page.
The label `DEFAULT` may not be used as it is reserved for special use.

The configuration for each draggable label may use the following keys:
* `content` (required): HTML that is rendered in the draggable element in the page
* `feedback`: feedback HTML strings for each draggable-droppable pair.
  Feedback defined in the droppable section in the JSON takes priority if feedback is defined
  under both sections for the same pair. The key `DEFAULT` may be used to define feedback
  for the pairs that are not listed under draggables nor droppables. The `DEFAULT` key is
  first read from the droppables section.
* `reuse`: can this draggable be used again after it has been dragged to the correct droppable?
  Accepts values `true` or `false`, defaults to `true`
* `reveal`: what is revealed in the droppable when this draggable is dragged there?
  By default, the droppable content is replaced with the draggable `content`, which is
  often the desired effect when dragging text onto empty holes.
  Accepts values `false` (to disable the reveal effect completely in the droppable) or
  an object with one of the following keys:
  - `replace`: replace the droppable content with this HTML string
  - `append`: append this HTML string to the end of the droppable content
    (smaller font size and surrounding square brackets are added automatically)
  - `prepend`: like `append`, but the HTML string is prepended to the start of the droppable content
  
  The `append` and `prepend` values may be used, for example, when the student is
  supposed to categorize parts of the given text. The categories are then given as
  draggables and complete sentences in the text act as droppables. The text would
  become unreadable if complete sentences were replaced with just their category,
  like "topic sentence".


## JSON definitions for the droppables

The droppables section in the JSON file defines which draggables are correct answers
to each droppable. Feedback to the answers may be defined under either draggables or
droppables in the JSON (or mixed in both sections). Feedback was already explained
in the previous section.

Example JSON:
```json
{
  "draggables": {
    see the previous example
  },
  "droppables": {
    "droppablelabel1": {
      "feedback": {
        "DEFAULT": "Wrong!"
      },
      "correct": "draglabel1",
    },
    "droppablelabel2": {
      "feedback": {
        "draglabel2": "Correct! Either \"a\" or \"the\" can be used here.",
        "draglabel3": "Correct! Either \"a\" or \"the\" can be used here.",
      },
      "correct": ["draglabel2", "draglabel3"],
    },
    "droppablelabel3": {
      "feedback": {
        "draglabel1": "Wrong! This would usualy be correct but not in this case due to X.",
        "draglabel2": "Correct!",
        "DEFAULT": "Wrong!"
      },
      "correct": "draglabel2"
    }
  }
}
```

The `droppables` object in the JSON must define configuration for each droppable label
that is used in the exercise XML file. The following keys may be defined for each droppable:
* `correct` (required): if only one draggable is the correct answer to this droppable,
  give the draggable label as a string here. Otherwise, if any one of multiple draggables
  is accepted as the correct answer, give the draggable labels in an array (`["label1", "label2", ...]`)
* `feedback`: feedback HTML strings for each draggable-droppable pair. See `feedback` in
  the draggables section for a more detailed explanation.


## Combined feedback

Combined feedback provides additional feedback when the student triggers a certain
combination of answers across multiple droppables.

Example JSON:
```json
{
  "draggables": {
    ...
  },
  "droppables": {
    ...
  },
  "combinedfeedback": [
    {
      "combo": [["draggablelabel1", "droppablelabel2"], ["draggablelabel2", "droppablelabel1"]],
      "feedback": "Combo: great, you got the first two right!"
    },
    {
      "combo": [["draggablelabel3", "droppablelabel1"], ["draggablelabel1", "droppablelabel2"], ["draggablelabel2", "droppablelabel3"]],
      "feedback": "This combination of words is commonly used in technical writing within computer science."
    },
    {
      "combo": [["draggablelabel1", 0], ["draggablelabel2", 1]],
      "feedback": "Combo feedback set with droppable IDs: draggables 1 and 2 dragged into the first two droppables",
      "useDroppableId": true
    }
  ]
}
```

The JSON file may define the key `combinedfeedback` in the top level if combined
feedback should be used. Using this feature is completely optional. The value of the
`combinedfeedback` key is an array that consists of objects. Each object defines
one combination. The objects use the following keys:

* `combo`: an array of 2-element arrays. The nested arrays define draggable-droppable pairs,
  i.e., answers. At least two pairs should be defined so that there is a combination
  of multiple answers, not just one. Droppables are defined by their labels by default,
  however, if the option `useDroppableId` is set, they are defined by their unique IDs.
  
  Droppable labels may be reused in the exercise, i.e., there may be several droppables
  with the same label and any of them could satisfy the requirement in the combo.
  If the label of a droppable is reused and only one of the droppables should be affected
  by a combo, use the droppable ID to define that one specific droppable.
  Droppable IDs start from 0 and increment sequentially. For example,
  the first droppable in the exercise has ID zero and the second has ID one
  (as seen in the exercise XML file and in the rendered web page; the order is
  not based on the JSON definition of the droppables).
  When using IDs, you must count the number of droppables in the exercise yourself so
  that you may write the correct IDs in the JSON file. The IDs must be updated if
  you add new droppables since the subsequent droppable IDs increase then.
  Note that the IDs are integers, not strings, so no quotation marks are used
  around IDs in the JSOn file.
* `feedback`: the feedback HTML string that is shown when the combination is triggered.
  The additional feedback does not replace the normal feedback.
* `useDroppableId` (optional): if set to true, the `combo` array in this object uses
  droppable IDs instead of droppable labels to define the droppables in each pair.
  By default, labels are used.


# Custom stylesheets

Custom CSS styles can be defined using the `<style>` tag. The `<html>` and `<head>` tags must be used in this case.
```html
<html>
  <head>
    <style>
      [custom styles]
    </style>
  </head>
  <body>
    ...
  </body>
</html>
```

Alternatively, you can create a CSS file in the static folder of the content package and include it like this:
```html
<head>
  <link href="/static/content-package-name/my-stylesheet.css" rel="stylesheet">
</head>
```
