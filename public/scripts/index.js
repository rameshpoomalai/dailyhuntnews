// index.js

var REST_DATA = 'api/favorites';
var KEY_ENTER = 13;
var defaultItems = [

];

function encodeUriAndQuotes(untrustedStr) {
    return encodeURI(String(untrustedStr)).replace(/'/g, '%27').replace(')', '%29');
}

function loadItems() {
    var table = document.getElementById('notes');
    while(table.rows.length > 0) {
      table.deleteRow(0);
    }
    showLoadingMessage();
    var topic = document.getElementById('searchFilter').value;

    xhrGet(REST_DATA+"?topic="+topic, function(data) {

        var newRow = document.createElement('tr');
        newRow.innerHTML="<td width=80%><div class='contentHeader'>Title</div></td><td width=15%><div class='contentHeader'>Relevancy Weight</div></td><td width=5%/>";
        document.getElementById('notes').lastChild.appendChild(newRow);

        //stop showing loading message
        stopLoadingMessage();

        var receivedItems = data || [];
        var items = [];
        var i;
        // Make sure the received items have correct format
        for (i = 0; i < receivedItems.length; ++i) {
            var item = receivedItems[i];
            if (item && 'id' in item) {
                items.push(item);
            }
        }
        items.sort(function(a, b){
          return b.final_score-a.final_score
        });

        var hasItems = items.length;
        if (!hasItems) {
            items = defaultItems;
        }
        for (i = 0; i < items.length; ++i) {
            addItem(items[i], !hasItems);
        }
        if (!hasItems) {
            var table = document.getElementById('notes');
            var nodes = [];
            for (i = 0; i < table.rows.length; ++i) {
                nodes.push(table.rows[i].firstChild.firstChild);
            }

            function save() {
                if (nodes.length) {
                    saveChange(nodes.shift(), save);
                }
            }
            save();
        }
    }, function(err) {
        console.error(err);
    });
}

function startProgressIndicator(row) {
    row.innerHTML = "<td class='content'>Uploading file... <img height=\"50\" width=\"50\" src=\"images/loading.gif\"></img></td>";
}

function removeProgressIndicator(row) {
    row.innerHTML = "<td class='content'>uploaded...</td>";
}

function addNewRow(table) {
    var newRow = document.createElement('tr');
    table.appendChild(newRow);
    return table.lastChild;
}


function setRowContent(item, row) {

    var rank =(parseFloat(item.value).toFixed(2));
    var innerHTML = "<td><div class='contentTiles'><a href=\"" + encodeUriAndQuotes(item.url) + "\" target=\"_blank\">" + item.name + "</a></div></td>";
    innerHTML += "<td><textarea id='valText' class='contentTiles' >"+ rank  +"</textarea></td>";
    innerHTML += "<td class = 'contentAction'><span class='detailBtn' onclick='showDetails(\""+item.news_id+"\")' title='Show more details'></span>";
    innerHTML += "<div class='contentHidden' style=\"display:none\" id='"+item.news_id+"'><table><tr><td title='The fraction of the overall trending concepts in social media and other other news around the same topic included in this article. Higher is better'>Concept Score : </td><td>"+(parseFloat(item.concept_score).toFixed(2))+"</td>";
    innerHTML += "<td title='The fraction of the overall trending entities in social media and other news around the same topic included in this article. Higher is better.'>Entity Score : </td><td>"+(parseFloat(item.entity_score).toFixed(2))+"</td></tr>";
    innerHTML += "<tr><td title='Summarizes the dominant tense of the statements in the article on a scale of past to future from -1 to 1. 0 = Present. 1 = Future. -1 = Past.'>Tense Score : </td><td>"+(parseFloat(item.tense_score).toFixed(2))+"</td>";
    innerHTML += "<td title='The fraction of the overall trending keywords in social media and other news around the same topic included in this article. Higher is better.'>Keyword Score : </td><td>"+(parseFloat(item.keyword_score).toFixed(2))+"</td></tr>";
    innerHTML += "<tr><td> </td><td></td><td title=' Obtained using a weighted average of the coverage scores.'>Final Score : </td><td>"+(parseFloat(item.final_score).toFixed(2))+"</td></tr><table></div></td>";
    row.innerHTML = innerHTML;

}

function addItem(item, isNew) {

    var row = document.createElement('tr');
    row.className = "tableRows";
    var id = item && item.id;
    if (id) {
        row.setAttribute('data-id', id);
    }



    if (item) // if not a new row
    {
        setRowContent(item, row);
    }

    var table = document.getElementById('notes');
    table.lastChild.appendChild(row);
    row.isNew = !item || isNew;

    if (row.isNew) {
        var textarea = row.firstChild.firstChild;
        textarea.focus();
    }

}


function saveChange(contentNode, callback) {
    var row = contentNode.parentNode.parentNode;

    var data = {
        name: row.firstChild.firstChild.value,
        value: row.firstChild.nextSibling.firstChild.value
    };

    if (row.isNew) {
        delete row.isNew;
        xhrPost(REST_DATA, data, function(item) {
            row.setAttribute('data-id', item.id);
            callback && callback();
        }, function(err) {
            console.error(err);
        });
    } else {
        data.id = row.getAttribute('data-id');
        xhrPut(REST_DATA, data, function() {
            console.log('updated: ', data);
        }, function(err) {
            console.error(err);
        });
    }
}

function toggleServiceInfo() {
    var node = document.getElementById('vcapservices');
    node.style.display = node.style.display == 'none' ? '' : 'none';
}

function toggleAppInfo() {
    var node = document.getElementById('appinfo');
    node.style.display = node.style.display == 'none' ? '' : 'none';
}


function showLoadingMessage() {
    document.getElementById('loadingImage').style.display = '';
    document.getElementById('loadingImage').innerHTML = "Loading data " + "<img height=\"100\" width=\"100\" src=\"images/loading.gif\"></img>";
}

function stopLoadingMessage() {
    document.getElementById('loadingImage').innerHTML = "";
}

var input = document.getElementById("searchFilter");

// Execute a function when the user releases a key on the keyboard
input.addEventListener("keyup", function(event) {
  // Cancel the default action, if needed
  event.preventDefault();
  // Number 13 is the "Enter" key on the keyboard
  if (event.keyCode === 13) {
    // Trigger the button element with a click
    document.getElementById("btnSearch").click();
  }
});


function showDetails(detailsId)
{
  document.getElementById('myModal').style.display = "block";
  document.getElementById("detailContent").innerHTML = document.getElementById(detailsId).innerHTML
}

// When the user clicks on <span> (x), close the modal
function closeModelDialog() {
    document.getElementById('myModal').style.display = "none";
    document.getElementById("detailContent").innerHTML = "";
}
