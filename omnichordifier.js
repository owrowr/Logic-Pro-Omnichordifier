// OMNICHORDIFIER
// Logic Pro X Scripter Plugin
// Version 1.0
// By OLLE WR
// DRÖMVERKSTADEN AB - 2024
// Free to use and modify 🦄

// SETTINGS
var BLOCK_NOTE_AND_MOD = 1;
var STEPS = 2;
var TRANSPOSITION = 12;
var NOTE_LENGTH = 100;
var NEVER_SAME_NOTE_TWICE = 1;
var FIXED_TOP_BOT_NOTE = 1;

// CONSTANTS and UTILITIES
var ACTIVE_NOTES = [];
var NOTE_DISTRIBUTION = [];
var LAST_PLAYED_NOTE = 0;
var PluginParameters = [];

// HANDLE INCOMMING MIDI
function HandleMIDI(event) {
  if (event instanceof NoteOn || event instanceof NoteOff) {
    UpdateActiveNotes(event);
    SortActiveNotes();
    UpdateNoteDistribution();
  }
  if (event instanceof ControlChange && event.number == 1) {
    Strum(event);
    if (BLOCK_NOTE_AND_MOD) {
      return;
    }
  }
  if (event instanceof NoteOn && BLOCK_NOTE_AND_MOD) {
    return;
  } else {
    event.send(); // Send all other midi events through
  }
}

// STRUMMING LOGIC
function Strum(event) {
  if (FIXED_TOP_BOT_NOTE && (event.value == 0 || event.value == 127)) {
    StrumFixedTopBot(event);
    return;
  }
  var noteSpace = Math.floor(127 / NOTE_DISTRIBUTION.length);
  var noteIndex = Math.floor(event.value / noteSpace);
  var note = NOTE_DISTRIBUTION[noteIndex];
  var noteStop = new NoteOff(note);
  if (note instanceof NoteOn) {
    if (NEVER_SAME_NOTE_TWICE && note.pitch == LAST_PLAYED_NOTE) {
      return;
    }
    LAST_PLAYED_NOTE = note.pitch;
    note.send();
    noteStop.sendAfterMilliseconds(NOTE_LENGTH);
  }
}

// DISPLAY USER INTERFACE
function BuildUI() {
  addTextParameter("OLLES OMNICHORDIFIER");
  addTextParameter("Hold chord + strum mod wheel");
  addCheckboxParameter("Block Notes + MOD through", 1);
  addCheckboxParameter("Never same note twice", 1);
  addCheckboxParameter("Fixed top/bottom note", 1);
  addLinScaleParameter("Note Length", 1, 1000, 200, "ms", 999);
  addLinScaleParameter("Steps up", 1, 24, 3, "steps", 23);
  addLinScaleParameter("Semitones per step", 1, 24, 12, "st", 23);
}
BuildUI();

// UPDATE PARAMETERS
function ParameterChanged(param, value) {
  let paramName = PluginParameters[param].name;
  switch (paramName) {
    case "Block Notes + MOD through":
      BLOCK_NOTE_AND_MOD = value;
      break;
    case "Steps up":
      STEPS = value;
      TOTAL_NOTES = STEPS * TRANSPOSITION;
      LENGTH_BETWEEN_NOTES = Math.floor(127 / TOTAL_NOTES);
      break;
    case "Semitones per step":
      TRANSPOSITION = value;
      TOTAL_NOTES = STEPS * TRANSPOSITION;
      LENGTH_BETWEEN_NOTES = Math.floor(127 / TOTAL_NOTES);
      break;
    case "Note Length":
      NOTE_LENGTH = value;
      break;
    case "Never same note twice":
      NEVER_SAME_NOTE_TWICE = value;
      break;
    case "Fixed top/bottom note":
      FIXED_TOP_BOT_NOTE = value;
      break;
  }
  Trace("Parameter Changed: " + paramName + " to: " + value);
  ACTIVE_NOTES = [];
}

// HELPER FUNCTIONS
function Reset() {
  ACTIVE_NOTES = []; // Reset active notes at start of playback
}

function addTextParameter(name) {
  PluginParameters.push({ name: name, type: "text" });
}

function addCheckboxParameter(name, defaultValue) {
  PluginParameters.push({
    name: name,
    type: "checkbox",
    defaultValue: defaultValue,
  });
}

function addLinScaleParameter(
  name,
  minValue,
  maxValue,
  defaultValue,
  unit,
  steps
) {
  PluginParameters.push({
    name: name,
    type: "lin",
    minValue: minValue,
    maxValue: maxValue,
    defaultValue: defaultValue,
    unit: unit,
    numberOfSteps: steps,
  });
}

function StrumFixedTopBot(event) {
  if (NOTE_DISTRIBUTION.length == 0) {
    return;
  }
  let arrLength = NOTE_DISTRIBUTION.length - 1;
  let oldTopNote = NOTE_DISTRIBUTION[arrLength];
  let newBotNote = new NoteOn(NOTE_DISTRIBUTION[0]);
  let note = new NoteOn(newBotNote);

  if (event.value == 127) {
    note.pitch = oldTopNote.pitch;
  } else if (event.value == 0) {
    note.pitch = newBotNote.pitch;
  }

  if (note instanceof NoteOn) {
    var noteStop = new NoteOff(note);
    LAST_PLAYED_NOTE = note.pitch;
    note.send();
    noteStop.sendAfterMilliseconds(NOTE_LENGTH);
  }
}

function UpdateActiveNotes(event) {
  if (event instanceof NoteOn) {
    ACTIVE_NOTES.push(event);
  } else if (event instanceof NoteOff) {
    for (i = 0; i < ACTIVE_NOTES.length; i++) {
      if (ACTIVE_NOTES[i].pitch == event.pitch) {
        ACTIVE_NOTES.splice(i, 1);
        break;
      }
    }
  }
}

function UpdateNoteDistribution() {
  NOTE_DISTRIBUTION = [];
  let currentTransposition = 0;
  for (let j = 0; j <= STEPS; j++) {
    for (let k = 0; k < ACTIVE_NOTES.length; k++) {
      let newNote = new NoteOn(ACTIVE_NOTES[k]);
      newNote.pitch += currentTransposition;
      NOTE_DISTRIBUTION.push(newNote);
    }
    currentTransposition += TRANSPOSITION;
  }
}

function SortActiveNotes() {
  ACTIVE_NOTES.sort(function (a, b) {
    return a.pitch - b.pitch;
  });
}
