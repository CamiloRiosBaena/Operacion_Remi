/*
   Licensed to the Apache Software Foundation (ASF) under one or more
   contributor license agreements.  See the NOTICE file distributed with
   this work for additional information regarding copyright ownership.
   The ASF licenses this file to You under the Apache License, Version 2.0
   (the "License"); you may not use this file except in compliance with
   the License.  You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
var showControllersOnly = false;
var seriesFilter = "";
var filtersOnlySampleSeries = true;

/*
 * Add header in statistics table to group metrics by category
 * format
 *
 */
function summaryTableHeader(header) {
    var newRow = header.insertRow(-1);
    newRow.className = "tablesorter-no-sort";
    var cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Requests";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 3;
    cell.innerHTML = "Executions";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 7;
    cell.innerHTML = "Response Times (ms)";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Throughput";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 2;
    cell.innerHTML = "Network (KB/sec)";
    newRow.appendChild(cell);
}

/*
 * Populates the table identified by id parameter with the specified data and
 * format
 *
 */
function createTable(table, info, formatter, defaultSorts, seriesIndex, headerCreator) {
    var tableRef = table[0];

    // Create header and populate it with data.titles array
    var header = tableRef.createTHead();

    // Call callback is available
    if(headerCreator) {
        headerCreator(header);
    }

    var newRow = header.insertRow(-1);
    for (var index = 0; index < info.titles.length; index++) {
        var cell = document.createElement('th');
        cell.innerHTML = info.titles[index];
        newRow.appendChild(cell);
    }

    var tBody;

    // Create overall body if defined
    if(info.overall){
        tBody = document.createElement('tbody');
        tBody.className = "tablesorter-no-sort";
        tableRef.appendChild(tBody);
        var newRow = tBody.insertRow(-1);
        var data = info.overall.data;
        for(var index=0;index < data.length; index++){
            var cell = newRow.insertCell(-1);
            cell.innerHTML = formatter ? formatter(index, data[index]): data[index];
        }
    }

    // Create regular body
    tBody = document.createElement('tbody');
    tableRef.appendChild(tBody);

    var regexp;
    if(seriesFilter) {
        regexp = new RegExp(seriesFilter, 'i');
    }
    // Populate body with data.items array
    for(var index=0; index < info.items.length; index++){
        var item = info.items[index];
        if((!regexp || filtersOnlySampleSeries && !info.supportsControllersDiscrimination || regexp.test(item.data[seriesIndex]))
                &&
                (!showControllersOnly || !info.supportsControllersDiscrimination || item.isController)){
            if(item.data.length > 0) {
                var newRow = tBody.insertRow(-1);
                for(var col=0; col < item.data.length; col++){
                    var cell = newRow.insertCell(-1);
                    cell.innerHTML = formatter ? formatter(col, item.data[col]) : item.data[col];
                }
            }
        }
    }

    // Add support of columns sort
    table.tablesorter({sortList : defaultSorts});
}

$(document).ready(function() {

    // Customize table sorter default options
    $.extend( $.tablesorter.defaults, {
        theme: 'blue',
        cssInfoBlock: "tablesorter-no-sort",
        widthFixed: true,
        widgets: ['zebra']
    });

    var data = {"OkPercent": 96.7256005708396, "KoPercent": 3.27439942916039};
    var dataset = [
        {
            "label" : "FAIL",
            "data" : data.KoPercent,
            "color" : "#FF6347"
        },
        {
            "label" : "PASS",
            "data" : data.OkPercent,
            "color" : "#9ACD32"
        }];
    $.plot($("#flot-requests-summary"), dataset, {
        series : {
            pie : {
                show : true,
                radius : 1,
                label : {
                    show : true,
                    radius : 3 / 4,
                    formatter : function(label, series) {
                        return '<div style="font-size:8pt;text-align:center;padding:2px;color:white;">'
                            + label
                            + '<br/>'
                            + Math.round10(series.percent, -2)
                            + '%</div>';
                    },
                    background : {
                        opacity : 0.5,
                        color : '#000'
                    }
                }
            }
        },
        legend : {
            show : true
        }
    });

    // Creates APDEX table
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.9672560057083961, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "F1 - GET /api/menu/publico"], "isController": false}, {"data": [1.0, 500, 1500, "F2 - GET plato con ID fuera de rango"], "isController": false}, {"data": [0.9466793005426825, 500, 1500, "F1 - GET /api/menu/platos/1"], "isController": false}, {"data": [1.0, 500, 1500, "F2 - POST registro con JSON malformado"], "isController": false}, {"data": [1.0, 500, 1500, "F2 - POST registro con datos inválidos"], "isController": false}, {"data": [1.0, 500, 1500, "F2 - GET staff con token falso"], "isController": false}, {"data": [1.0, 500, 1500, "F2 - GET QR con token mal formado"], "isController": false}, {"data": [1.0, 500, 1500, "F2 - GET ruta inexistente"], "isController": false}, {"data": [0.9466437177280551, 500, 1500, "F1 - GET /api/menu/promos"], "isController": false}]}, function(index, item){
        switch(index){
            case 0:
                item = item.toFixed(3);
                break;
            case 1:
            case 2:
                item = formatDuration(item);
                break;
        }
        return item;
    }, [[0, 0]], 3);

    // Create statistics table
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 37839, 1239, 3.27439942916039, 2.186289278257893, 0, 114, 2.0, 4.0, 5.0, 6.0, 63.14940971098035, 98.32228838328483, 8.324442434408159], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["F1 - GET /api/menu/publico", 11630, 0, 0.0, 0.6908856405846981, 0, 107, 1.0, 1.0, 2.0, 3.0, 19.40927706701291, 50.8166716959586, 2.5019771219196327], "isController": false}, {"data": ["F2 - GET plato con ID fuera de rango", 496, 0, 0.0, 0.7782258064516129, 0, 61, 1.0, 1.0, 1.0, 2.0, 0.8333081324825526, 0.6892695197389864, 0.11637017865723148], "isController": false}, {"data": ["F1 - GET /api/menu/platos/1", 11609, 619, 5.33206994573176, 4.134636919631329, 1, 114, 4.0, 5.0, 5.0, 7.0, 19.411972249023048, 29.111062393818568, 2.5212815518750635], "isController": false}, {"data": ["F2 - POST registro con JSON malformado", 499, 0, 0.0, 1.1983967935871758, 0, 60, 1.0, 2.0, 2.0, 3.0, 0.8338555374524794, 0.7239234109328655, 0.16611965785186114], "isController": false}, {"data": ["F2 - POST registro con datos inválidos", 498, 0, 0.0, 1.0100401606425695, 0, 4, 1.0, 2.0, 2.0, 2.009999999999991, 0.8335899942418683, 0.7912592523467734, 0.19048833852792693], "isController": false}, {"data": ["F2 - GET staff con token falso", 495, 0, 0.0, 0.8080808080808075, 0, 59, 1.0, 1.0, 1.0, 2.0, 0.8341703122998834, 0.6826510954172874, 0.13441220852488356], "isController": false}, {"data": ["F2 - GET QR con token mal formado", 495, 0, 0.0, 0.789898989898989, 0, 46, 1.0, 1.0, 2.0, 2.0, 0.8341703122998834, 0.6745049009612338, 0.1173052001671711], "isController": false}, {"data": ["F2 - GET ruta inexistente", 497, 0, 0.0, 0.5835010060362178, 0, 2, 1.0, 1.0, 1.0, 2.0, 0.8333165664004077, 0.6762559244909558, 0.10497835650942636], "isController": false}, {"data": ["F1 - GET /api/menu/promos", 11620, 620, 5.335628227194492, 2.0761617900172, 0, 40, 2.0, 3.0, 3.0, 4.0, 19.413323353793615, 14.252645785788513, 2.4835403899872692], "isController": false}]}, function(index, item){
        switch(index){
            // Errors pct
            case 3:
                item = item.toFixed(2) + '%';
                break;
            // Mean
            case 4:
            // Mean
            case 7:
            // Median
            case 8:
            // Percentile 1
            case 9:
            // Percentile 2
            case 10:
            // Percentile 3
            case 11:
            // Throughput
            case 12:
            // Kbytes/s
            case 13:
            // Sent Kbytes/s
                item = item.toFixed(2);
                break;
        }
        return item;
    }, [[0, 0]], 0, summaryTableHeader);

    // Create error table
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["500/Internal Server Error", 1239, 100.0, 3.27439942916039], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 37839, 1239, "500/Internal Server Error", 1239, "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["F1 - GET /api/menu/platos/1", 11609, 619, "500/Internal Server Error", 619, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["F1 - GET /api/menu/promos", 11620, 620, "500/Internal Server Error", 620, "", "", "", "", "", "", "", ""], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
