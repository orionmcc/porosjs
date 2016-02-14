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
xhttp.onreadystatechange = function() {
  if (xhttp.readyState == 4) {
    if (xhttp.status != 200) {
      setTimeout(saveData, 5000);
      setStatus(STATUS_ERROR, true);
    } else {
      saveQue.shift();
      setTimeout(saveData, 1);
    }
  }
  setTimeout( function(){ setStatus(STATUS_PUSH, false) }, 500);
};

function enqueueData(el) {
  saveQue.push(el);
}

function saveData() {
  if (saveQue.length) {
    var el = saveQue[0];
    var value = el.value || el.innerText;
    setStatus(STATUS_PUSH, true);
    setStatus(STATUS_ERROR, false);
    xhttp.open("POST", "/api/data", true);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhttp.send("value="+value+
      "&name="+el.dataset.name+
      "&key="+el.dataset.key+
      "&range="+el.dataset.id
    );
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
  enqueueData(el);
}

function getData (endpoint, ctx, next) {
  setStatus(STATUS_PULL, true);

  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (xhttp.readyState == 4) {
      if (xhttp.status != 200) {
        console.error('Fetch error: '+endpoint);
      } else {
        ctx.params.data = JSON.parse(xhttp.response);
        next();
      }

      setTimeout( function(){ setStatus(STATUS_PULL, false) }, 500);
    }
  };

  xhttp.open("GET", "/api/data" + endpoint, true);
  xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  xhttp.send("");
}
