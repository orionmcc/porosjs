//// GLOBAL CONSTANTS

// OPS
const ADD = "ADD";
const NONE = "NONE";
const REMOVE = "REMOVE";

// TYPES
const ARRAY = "ARRAY";
const NULL = "NULL";
const OBJECT = "OBJECT";
const SCALAR = "SCALAR";

// OTHER
const NON_RELEVANT_VALUE = "..."

//// OBJECTS
function Diff(key, value, op, valueType) {
  this.key = key;
  this.value = value;
  this.op = op;
  this.valueType = valueType;
}

function TopDiff(type, diff) {
  this.topType = type;
  this.diff = diff;
}

function ValidationException(leftError, rightError) {
  this.leftError = leftError;
  this.rightError = rightError;
}

function ComparingKeyAndValueStrategy () {
  this.getScalarsDiff = function(leftKey, leftValue, rightKey, rightValue) {
    var result = [];
    if(leftValue !== rightValue) {
      result.push(new Diff(leftKey, leftValue, ADD, SCALAR), new Diff(rightKey, rightValue, REMOVE, SCALAR));
    } else {
      result.push(new Diff(leftKey, leftValue, NONE, SCALAR));
    }
    return result;
  };

  this.createDiff = function(key, value, op, valueType) {
    return new Diff(key, value, op, valueType);
  }

  this.createDiffForDifferentTypes = function(key, leftValue, leftOp, leftValType, rightValue, rightOp, rightValType) {
    return [this.createDiff(key, leftValue, leftOp, leftValType), this.createDiff(key, rightValue, rightOp, rightValType)];
  }
}

function ComparingKeyStrategy () {
  this.getScalarsDiff = function(leftKey, leftValue, rightKey, rightValue) {
    var result = [];
    if(leftKey !== null) {
      if(leftKey !== rightKey) {
        result.push(new Diff(leftKey, NON_RELEVANT_VALUE, ADD, SCALAR), new Diff(rightKey, NON_RELEVANT_VALUE, REMOVE, SCALAR));
      } else {
        result.push(new Diff(leftKey, NON_RELEVANT_VALUE, NONE, SCALAR));
      }
    } else {
      result.push(new Diff(null, NON_RELEVANT_VALUE, NONE, SCALAR));
    }
    return result;
  };

  this.createDiff = function(key, value, op, valueType) {
    if(valueType === SCALAR) return new Diff(key, NON_RELEVANT_VALUE, op, valueType);
    if(key === null && op !== NONE) return new Diff(key, NON_RELEVANT_VALUE, NONE, SCALAR);
    if(key !== null && op !== NONE) return new Diff(key, NON_RELEVANT_VALUE, op, SCALAR);
    return new Diff(key, value, op, valueType);
  }

  this.createDiffForDifferentTypes = function(key, leftValue, leftOp, leftValType, rightValue, rightOp, rightValType) {
    return [this.createDiff(key, NON_RELEVANT_VALUE, NONE, SCALAR)];
  }
}

//// MAIN FUNCTION
function getDiffRepresentation(left, right, strategy) {

  function _getType(v) {
    if(v === null) return NULL;
    var type = typeof(v);
    if (type === 'number' || type === 'string' || type === 'boolean') return SCALAR;
    if (type === 'object') {
      if (v.constructor === Array) return ARRAY;
      else return OBJECT;
    }
  }

  function _getInDepthDiff(json, op) {
    var type = _getType(json);
    if(type === OBJECT) return _getInDepthJsonDiff(json, op);
    else if(type === ARRAY) return _getInDepthArrayDiff(json, op);
    else return json;
  }

  function _getInDepthArrayDiff(json, op) {
    var result = [];
    for(var i = 0;i < json.length;i++) {
      var value = json[i];
      var valueType = _getType(value);
      if (valueType === SCALAR) {
        result.push(strategy.createDiff(null, value, op, SCALAR));
      } else if (valueType === OBJECT) {
        result.push(strategy.createDiff(null, _getInDepthJsonDiff(value, op), op, OBJECT));
      } else {
        result.push(strategy.createDiff(null, _getInDepthArrayDiff(value, op), op, ARRAY));
      }
    }
    return result;
  }

  function _getInDepthJsonDiff(json, op) {
    var result = [];

    for(var key in json) {
      var value = json[key];
      var valueType = _getType(value);
      if (valueType === SCALAR) {
        result.push(strategy.createDiff(key, value, op, SCALAR));
      } else if (valueType === OBJECT) {
        result.push(strategy.createDiff(key, _getInDepthJsonDiff(value, op), op, OBJECT));
      } else {
        result.push(strategy.createDiff(key, _getInDepthArrayDiff(value, op), op, ARRAY));
      }
    }
    result.sort(_sortByKeyAndOp);
    return result;
  }

  function _getArraysDiff(left, right) {
    var result = [];
    var minLength = Math.min(left.length, right.length);
    for(var i = 0;i < minLength;i++) {
      var leftType = _getType(left[i]);
      var rightType = _getType(right[i]);
      if(leftType === rightType) {
        if(leftType === SCALAR) {
          result = result.concat(strategy.getScalarsDiff(null, left[i], null,  right[i]));
        } else if(leftType === OBJECT) {
          result.push(strategy.createDiff(null, _getJsonsDiff(left[i], right[i]), NONE, OBJECT));
        } else if(leftType === ARRAY){
          result.push(strategy.createDiff(null, _getArraysDiff(left[i], right[i]), NONE, ARRAY));
        } else {
          result.push(strategy.createDiff(null, null, NONE, NULL));
        }
      } else {
        result = result.concat(strategy.createDiffForDifferentTypes(
            null, _getInDepthDiff(left[i], ADD), ADD, leftType, _getInDepthDiff(right[i], REMOVE), REMOVE, rightType));
      }
    }

    var excessArrayInfo = left.length < right.length ? {"array":right, "operation":REMOVE} : {"array":left, "operation":ADD};
    for(var i = minLength;i < excessArrayInfo["array"].length ;i++) {
      var val = excessArrayInfo["array"][i];
      var op = excessArrayInfo["operation"];
      result.push(strategy.createDiff(null, _getInDepthDiff(val, op), op, _getType(val)));
    }

    return result;
  }

  function _getJsonsDiff(left, right) {
    var result = [];

    for(var key in left) {
      if(!right.hasOwnProperty(key)) result.push(strategy.createDiff(key, _getInDepthDiff(left[key], ADD), ADD, _getType(left[key])));
      else {
        var leftType = _getType(left[key]);
        var rightType = _getType(right[key]);
        if(leftType === rightType) {
          if (leftType === SCALAR) {
            result = result.concat(strategy.getScalarsDiff(key, left[key], key,  right[key]));
          } else if (leftType === OBJECT) {
            result.push(strategy.createDiff(key, _getJsonsDiff(left[key], right[key]), NONE, OBJECT));
          } else if(leftType == ARRAY){
            result.push(strategy.createDiff(key, _getArraysDiff(left[key], right[key]), NONE, ARRAY));
          } else {
            result.push(strategy.createDiff(key, null, NONE, NULL));
          }
        } else {
          result = result.concat(strategy.createDiffForDifferentTypes(
              key, _getInDepthDiff(left[key], ADD), ADD, leftType, _getInDepthDiff(right[key], REMOVE), REMOVE, rightType));
        }
      }
    }

    for(var key in right) {
      if(!left.hasOwnProperty(key)) {
        result.push(strategy.createDiff(key, _getInDepthDiff(right[key], REMOVE), REMOVE, _getType(right[key])));
      }
    }

    result.sort(_sortByKeyAndOp);
    return result;
  }

  function _sortByKeyAndOp(a, b){
    if (a.key === b.key) return (a.op === ADD) ? -1 : (a.op === REMOVE) ? 1 : 0;
    return a.key > b.key ? 1 : (b.key > a.key) ? -1 : 0;
  }

  function _parseJson(input) {
    var parsedJson = null;
    try {
      parsedJson = JSON.parse(input);
    } catch(err) {
      return {"json": null, "exception": "Input is not a valid JSON"};
    }

    var jsonType = _getType(parsedJson);
    return jsonType === ARRAY || jsonType === OBJECT ?
      {"json": parsedJson, "exception": null} : {"json": parsedJson, "exception": "Input is not a valid JSON"};
  }

  strategy = typeof strategy !== 'undefined' ? strategy : new ComparingKeyAndValueStrategy();

  var leftParseResult = _parseJson(left);
  var rightParseResult = _parseJson(right);

  if(leftParseResult["exception"] !== null || rightParseResult["exception"] !== null)
    throw new ValidationException(leftParseResult["exception"], rightParseResult["exception"]);

  var leftJson = leftParseResult["json"]; var rightJson = rightParseResult["json"];
  var leftJsonType = _getType(leftParseResult["json"]); var rightJsonType = _getType(rightParseResult["json"]);

  if(leftJsonType === ARRAY && rightJsonType === ARRAY) return new TopDiff(ARRAY, _getArraysDiff(leftJson, rightJson));
  else if(leftJsonType === OBJECT && rightJsonType === OBJECT) return new TopDiff(OBJECT, _getJsonsDiff(leftJson, rightJson));
  else {
    strategy = new ComparingKeyAndValueStrategy();
    var leftOutput = new Diff(null, _getInDepthDiff(leftJson, ADD), ADD, leftJsonType);
    var rightOutput = new Diff(null, _getInDepthDiff(rightJson, REMOVE), REMOVE, rightJsonType);
    return new TopDiff(NULL, [leftOutput, rightOutput]);
  }
}
