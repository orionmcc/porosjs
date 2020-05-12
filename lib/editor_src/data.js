const STATUS_PUSH = 'poros-status-push';
const STATUS_PULL = 'poros-status-pull';
const STATUS_ERROR = 'poros-status-error';
function setStatus(status, on) {
  var statusEl = document.getElementById('poros-status');
  if(on) addClass(statusEl, status);
  else removeClass(statusEl, status);
}



var saveQue = [];
var errorAttempts = 0;

function enqueueEl(el) {
  var value = el.value || el.innerText;

  var payload = {
    api: '/api/data',
    value: {
      value: value,
      name: el.dataset.name,
      key: el.dataset.key,
      range: el.dataset.id
    },
    //contentType: "application/json",
  }
  saveQue.push(payload);
}

function enqueueData(api, method, data, cb, contentType) {
  var payload = {
    method: method,
    api: api,
    value: data,
    cb: cb,
  }
  saveQue.push(payload);
}

function enqueueFileUpload(api, method, data, cb, contentType) {
  var payload = {
    method: method,
    api: api,
    fileData: data,
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

    var dataValue;
    var headers;

    if (data.fileData) {
      dataValue = data.fileData;
      headers = {};
    } else if (data.value) {
      dataValue = JSON.stringify(data.value);
      headers = { 'Content-Type': 'application/json' };
    } else {
      dataValue = null;
      headers = { 'Content-Type': 'text/plain' };
    }

    fetch(data.api,
    {
      method: method,
      body: dataValue,
      headers: headers,
    })
    .then(function(resp) {
      if (resp.status == 401) {
        setStatus(STATUS_ERROR, true);
        if (saveQue[0].cb) saveQue[0].cb(resp.status);
        saveQue.shift();
        setTimeout(saveData, 1);
      } else if (resp.status != 200) {
        if (errorAttempts < 3) {
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
      setTimeout( function(){ setStatus(STATUS_PUSH, false) }, 500);
    })
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

  fetch("/api" + endpoint,
    {
      method: "GET",
    })
    .then(function(resp) {
      setTimeout( function(){ setStatus(STATUS_PULL, false) }, 500);
      if (resp.status == 200 ) {
        return resp.json();
      } else {
        throw "APi returned " + resp.status;
      }
    })
    .then(function(data) {
       ctx.params[location] = data;
      next();
    })
    .catch(function(err) {
      console.error('Fetch error: '+endpoint);
    });
}
