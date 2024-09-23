// MIDI-MATRIX
// Logic Pro X Scripter Plugin
// Version 1.0
// By OLLE WR
// DRÖMVERKSTADEN AB - 2024
// Free to use and modify 🦄

// -------- IMPORTANT STUFF❗❗❗❗ --------
// Here you can set the number of inputs and targets per input
// These are probably the only settings you need to change to customize the plugin
var TOTAL_INPUTS = 4;
var TARGETS_PER_INPUT = 1;

// -------- SETTINGS --------
var BLOCK_CC = 0;
var TOTAL_TARGETS = 0; // Dynamically tracks total number of targets
var LOGARITHMIC = 0; // 0 = linear, 1 = logarithmic

// -------- CONSTANTS --------
const MIDI_CC_RANGE = 128;
const MIDI_TYPES = {
  off: 0,
  note: 1,
  velocity: 2,
  pitchbend: 3,
  pressure: 4,
  controller: 5,
};

// -------- INITIALIZE PLUGIN PARAMETERS --------
var PluginParameters = [];
initPluginParameters();

function initPluginParameters() {
  addTextParameter("OLLES MIDI-MATRIX 🦄");
  addCheckboxParameter("Block CC through", 0);
  addCheckboxParameter("Logarithmic", 0);

  for (let i = 1; i <= TOTAL_INPUTS; i++) {
    createInputGroup(i);
    for (let j = 1; j <= TARGETS_PER_INPUT; j++) {
      createTargetGroup(++TOTAL_TARGETS);
    }
  }
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

function addTargetParameter(name) {
  PluginParameters.push({
    name: name,
    type: "target",
    defaultValue: 0,
  });
}

function createInputGroup(inputNumber) {
  addTextParameter("Input " + inputNumber);
  PluginParameters.push({
    name: "Input Type " + inputNumber,
    type: "menu",
    valueStrings: buildInputMenuNames(),
    defaultValue: 0,
  });
}

function buildInputMenuNames() {
  let names = [
    "-- OFF --",
    "Note",
    "Velocity",
    "Pitchbend",
    "Channel Pressure",
  ];
  for (let i = 0; i < MIDI_CC_RANGE; i++) {
    names.push(i + " - " + MIDI._ccNames[i]);
  }
  return names;
}

function createTargetGroup(targetNumber) {
  addTargetParameter("Target " + targetNumber);
  addScaleParameter("Min " + targetNumber, 0, 100, 0, "%");
  addScaleParameter("Max " + targetNumber, 0, 100, 100, "%");
}

function addScaleParameter(name, minValue, maxValue, defaultValue, unit) {
  let type = "lin";
  if (LOGARITHMIC) {
    type = "log";
  }
  PluginParameters.push({
    name: name,
    type: type,
    minValue: minValue,
    maxValue: maxValue,
    defaultValue: defaultValue,
    unit: unit,
    numberOfSteps: 100,
  });
}

// ----------------------------- ParameterChanged ------------------------------
function ParameterChanged(param, value) {
  let paramName = PluginParameters[param].name;
  if (paramName == "Block CC through") {
    BLOCK_CC = value;
  }
  if (paramName == "Logarithmic") {
    LOGARITHMIC = value;
  }
  Trace("Parameter: " + paramName + " Changed to: " + value);
}

// -------- HANDLE MIDI EVENTS --------
function HandleMIDI(event) {
  for (var i = 1; i <= TOTAL_INPUTS; i++) {
    var temp = "Input Type " + i;
    var currentInputType = GetParameter(temp);
    if (event instanceof NoteOn && currentInputType == MIDI_TYPES.note) {
      SendValueToAllTargets(event.pitch, MIDI_TYPES.note, i);
    }
    if (event instanceof NoteOn && currentInputType == MIDI_TYPES.velocity) {
      SendValueToAllTargets(event.velocity, MIDI_TYPES.velocity, i);
    }
    if (
      (event instanceof ChannelPressure &&
        currentInputType == MIDI_TYPES.pressure) ||
      (event instanceof ControlChange &&
        currentInputType == MIDI_TYPES.controller + event.number)
    ) {
      SendValueToAllTargets(event.value, MIDI_TYPES.controller, i);
    }
    if (
      event instanceof PitchBend &&
      currentInputType == MIDI_TYPES.pitchbend
    ) {
      SendValueToAllTargets(event.value, MIDI_TYPES.pitchbend, i);
    }
  }
  if (event instanceof ControlChange && BLOCK_CC == 1) {
    for (var i = 1; i <= TOTAL_INPUTS; i++) {
      var inputTypeParam = "Input Type " + i;
      var currentInputType = GetParameter(inputTypeParam);
      if (currentInputType == MIDI_TYPES.controller + event.number) {
        return;
      }
    }
  }
  event.send(); // Pass through the original event
}

function SendValueToAllTargets(value, midiType, inputNumber) {
  // setup input min/max values based on whether this is 8bit or 14bit message
  var minInput = 0;
  var maxInput = 127;
  if (midiType == MIDI_TYPES.pitchbend) {
    minInput = -8192;
    maxInput = 8191;
  }

  // Cycle through all targets and send the scaled value
  for (var i = 1; i <= TOTAL_TARGETS; i++) {
    var max = inputNumber * TARGETS_PER_INPUT;
    var min = inputNumber * TARGETS_PER_INPUT - TARGETS_PER_INPUT + 1;
    if (inputNumber == 1) {
      min = 1;
      max = TARGETS_PER_INPUT;
    }

    if (i <= max && i >= min) {
      var minOutput = GetParameter("Min " + i);
      var maxOutput = GetParameter("Max " + i);
      minOutput /= 100.0; //Divide by 100 convert from % to 0.0-1.0 scale
      maxOutput /= 100.0;

      var scaledValue = ScaleValue(
        value,
        minInput,
        maxInput,
        minOutput,
        maxOutput
      );
      var thisTargetName = "Target " + i;
      var event = new TargetEvent();
      event.target = thisTargetName;
      event.value = scaledValue;
      event.send();
      Trace(event.target + " " + event.value);
    }
  }
}

// -------- SCALE VALUE --------
function ScaleValue(inputValue, inputMin, inputMax, outputMin, outputMax) {
  return (
    ((outputMax - outputMin) * (inputValue - inputMin)) /
      (inputMax - inputMin) +
    outputMin
  );
}
