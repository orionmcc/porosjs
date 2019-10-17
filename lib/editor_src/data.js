const STATUS_PUSH = 'poros-status-push';
const STATUS_PULL = 'poros-status-pull';
const STATUS_ERROR = 'poros-status-error';
function setStatus(status, on) {
  var statusEl = document.getElementById('poros-status');
  if(on) addClass(statusEl, status);
  else removeClass(statusEl, status);
}



var saveQue = [];
var xhttp = new XMLHttpRequest();
var errorAttempts = 0;
xhttp.onreadystatechange = function() {
  if (xhttp.readyState == 4) {
    if (xhttp.status == 401) {
      setStatus(STATUS_ERROR, true);
      if (saveQue[0].cb) saveQue[0].cb(xhttp.status);
      saveQue.shift();
      setTimeout(saveData, 1);
    } else if (xhttp.status != 200) {
      if (errorAttempts < 5) {
        setTimeout(saveData, 10000);
        setStatus(STATUS_ERROR, true);
        errorAttempts++;
      } else {
        saveQue.shift();
        errorAttempts = 0;
        setTimeout(saveData, 1);
      }
    } else {
      errorAttempts = 0;
      if (saveQue[0].cb) saveQue[0].cb();
      saveQue.shift();
      setTimeout(saveData, 1);
    }
  }
  setTimeout( function(){ setStatus(STATUS_PUSH, false) }, 500);
};

function enqueueEl(el) {
  var value = el.value || el.innerText;

  var payload = {
    api: '/api/data',
    value: "value="+value+"&name="+el.dataset.name+"&key="+el.dataset.key+"&range="+el.dataset.id,
    contentType: "application/x-www-form-urlencoded",
  }
  saveQue.push(payload);
}

function enqueueData(api, method, data, cb, contentType) {
  var payload = {
    method: method,
    api: api,
    value: data.replace(/\+/g, "%2B"),
    cb: cb,
    contentType: "application/x-www-form-urlencoded"
  }
  saveQue.push(payload);
}

function enqueueFileUpload(api, method, data, cb, contentType) {
  var payload = {
    method: method,
    api: api,
    value: data,
    cb: cb,
    contentType: null
  }
  saveQue.push(payload);
}

function saveData() {
  if (saveQue.length) {
    var data = saveQue[0];
    var method = data.method || "POST";
    setStatus(STATUS_PUSH, true);
    setStatus(STATUS_ERROR, false);
    xhttp.open(method, data.api, true);
    if(data.contentType) xhttp.setRequestHeader("Content-type", data.contentType);
    xhttp.send(data.value);
  } else {
    setTimeout(saveData, 1000);
  }
}
saveData();

function saveModel(e) {
  console.log('saveModel', e);

  //Only do something if the value changed.
  if(e.target.startContent == e.target.targetElm.innerText) return;

  var el = e.target.targetElm;
  enqueueEl(el);
}

function getData (endpoint, location, ctx, next) {
  setStatus(STATUS_PULL, true);

  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (xhttp.readyState == 4) {
      if (xhttp.status != 200) {
        console.error('Fetch error: '+endpoint);
      } else {
        ctx.params[location] = JSON.parse(xhttp.response);
        //console.log(location, ctx.params[location]);
        next();
      }

      setTimeout( function(){ setStatus(STATUS_PULL, false) }, 500);
    }
  };

  xhttp.open("GET", "/api" + endpoint, true);
  xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  xhttp.send("");
}
