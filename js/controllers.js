/*
  Copyright(C) 2016 John Mears
  
  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
  
  
var pvmodule = angular.module('pvmodule', []);

pvmodule.factory('pvsettings', 
  function($window) {
    console.log("pvsettings service");
    var instance = {};
    
    instance.readLocalStorage = function(name, defvalue) {
      
      var v = null;
      
      try {
        // Requires HTML5 local storage:
        var storage = $window.localStorage; // null if not HTML 5
        v = JSON.parse(storage.getItem(name));
      } catch (e) {
        // That's OK, we will use the default value.
      }
      
      if (v === null)
        v = defvalue;

      return v;
    };

    // Read any previously stored settings, defaulting if not present:
    instance.data = {};
    instance.data.invertorUrl = instance.readLocalStorage("invertorUrl", "");   // 192.168.2.46
    instance.data.maxPower = instance.readLocalStorage("maxPower", 4);
    instance.data.autoPower = instance.readLocalStorage("autoPower", false);
    instance.data.maxEnergy = instance.readLocalStorage("maxEnergy", 20);
    instance.data.autoEnergy = instance.readLocalStorage("autoEnergy", false);
    instance.data.dataSource = instance.readLocalStorage("dataSource", "sample");

    instance.writeSettings = function(settings) {
      try {
        // Requires HTML5 local storage feature:
        var storage = $window.localStorage;
        storage.setItem("invertorUrl", JSON.stringify(settings.invertorUrl));
        storage.setItem("maxPower", JSON.stringify(settings.maxPower));
        storage.setItem("autoPower", JSON.stringify(settings.autoPower));
        storage.setItem("maxEnergy", JSON.stringify(settings.maxEnergy));
        storage.setItem("autoEnergy", JSON.stringify(settings.autoEnergy));
        storage.setItem("dataSource", JSON.stringify(settings.dataSource));
      } catch (e) {
        console.log("Could not write settings:" + e);
      }
    };

    instance.updateSettings = function(newSettings) {
      instance.writeSettings(newSettings);
      instance.data = newSettings;
    }

    console.log("pvsettings service done");
    return instance;
  });

pvmodule.factory('boschbpts', [
  'pvsettings', '$http',
  function(pvsettings, $http) {
    console.log("boschbpts service");
    
    var instance = {};
    
    instance.getLogAcEnergyParams = function(t1, t2) {
      return JSON.stringify({ timestampBegin: t1, timestampEnd: t2, resolution: 1 })
    };
    
    instance.makeUrl = function(rName) {
      if (pvsettings.data.dataSource === 'sample') {
        return 'sampledata/' + rName + '.json';
      }
      else
        return 'http://' + pvsettings.data.invertorUrl + '/pvi?rName=' + rName; 
    };

    instance.logAcPower = function(t1, t2, onSuccess, onError) {
      var xhrdata = JSON.stringify({ timestampBegin: t1, timestampEnd: t2, resolution: 0 });
      var logAcPowerUrl = instance.makeUrl("LogAcPower");
      if (pvsettings.data.dataSource === 'live') {
        $http.post(logAcPowerUrl, xhrdata, { headers: { 'Content-Type': undefined }})
          .then(onSuccess, onError);
      } else {
        $http.get(logAcPowerUrl)
          .then(onSuccess, onError);
      }
    };
    
    instance.logAcEnergy = function(t1, t2, onSuccess, onError) {
      var xhrdata = instance.getLogAcEnergyParams(t1, t2);
      var logAcEnergyUrl = instance.makeUrl("LogAcEnergy");
      if (pvsettings.data.dataSource === 'live') {
        $http.post(logAcEnergyUrl, xhrdata, { headers: { 'Content-Type': undefined }})
          .then(onSuccess, onError);
      } else {
        $http.get(logAcEnergyUrl)
          .then(onSuccess, onError);
      }
    };

    instance._get = function(param, onSuccess, onError) {
      var url = instance.makeUrl(param);
      $http.get(url, {}).then(onSuccess, onError);
    };

    instance.getAcPower = function(onSuccess, onError) {
      instance._get("AcPower", onSuccess, onError); 
    };

    instance.getDcPower = function(onSuccess, onError) {
      instance._get("DcPower", onSuccess, onError); 
    };

    instance.getYieldStatus = function(onSuccess, onError) {
      instance._get("YieldStatus", onSuccess, onError); 
    };

    instance.getStringVoltageAndCurrent = function(onSuccess, onError) {
      instance._get("StringVoltageAndCurrent", onSuccess, onError); 
    };

    instance.getInvertorInfo = function(onSuccess, onError) {
      instance._get("InverterInfo", onSuccess, onError); 
    };

    instance.getGridVoltageAndCurrent = function(onSuccess, onError) {
      instance._get("GridVoltageAndCurrent", onSuccess, onError); 
    };

    return instance;
  }]);

pvmodule.factory('display', [
  'pvsettings', 
  function(pvsettings) {
    console.log("display service");
    
    var instance = {};
    
    /**
     * Figure out how to use the screen and return the size of SVG that will
     * be required.
     */
    instance.layoutScreen = function(mainContainerId, mainDivId) {
      var navbar = document.getElementById('header-container');
      var hnavbar = navbar.offsetHeight;
      var hocuspocus = 5;    // Extra bottom margin so the browser doesn't think of adding a scroll bar.
      var fullheight = window.innerHeight - hnavbar - hocuspocus;
      var fullwidth = window.innerWidth;
      
      // Set the container to that size:
      var container = document.getElementById(mainContainerId);
      container.style.height = fullheight + "px";
      container.style.width = fullwidth + "px";
  
      // Now see how big our div element is:
      var navbar = document.getElementById(mainDivId);
      var maindivwidth = navbar.offsetWidth;
      var maindivheight = navbar.offsetHeight;
      
      // Do our SVG calculations based on that size: 
      var margin = {top: 20, right: 30, bottom: 20, left: 30},
      width = maindivwidth - margin.left - margin.right,
      height = maindivheight - margin.top - margin.bottom;
      
      result = { 
        "svg": {
          "width": width,
          "height": height
          },
        "margin": margin
      };
      
      return result; 
    }

    instance._clear = function(id) {
      var myNode = document.getElementById(id);
      while (myNode.firstChild) {
          myNode.removeChild(myNode.firstChild);
      }
    }
    
    /**
     * Get rid of any existing graph or chart, and create the top leve
     * elements required for a new graph.
     *
     * @return the top level svg to attach a graph to.
     */
    instance.reset = function(id, layout) {
      instance._clear(id);
      
      var svg = d3.select("#" + id)
          .append("svg")
            .classed("svg-content", true)
          // A top level g needed for the overall transform (not all browsers support it at the svg level):
          .append("g")    
            .attr("transform", "translate(" + layout.margin.left + "," + layout.margin.top + ")");

       return svg;
    }
    
    return instance;
  }]);

pvmodule.controller('GraphController',
  ['$scope', '$http', '$window', '$interval', '$route', 'boschbpts', 'pvsettings', 'display',
  function($scope, $http, $window, $interval, $route, boschbpts, pvsettings, display) {
    console.log("GraphController");
    
    $scope.mainDivId = "maindiv-graph";
    
    /**
     * Get the start and end of the day containing the date/time supplied.
     * Limit it to the hours that have any daylight.
     */
    $scope.getDayRange = function(d) {
      
      var starttime = d;
      starttime.setUTCHours(1);
      starttime.setUTCMinutes(0);
      starttime.setUTCSeconds(1);
      t1 = Math.floor(starttime.getTime() / 1000);
      
      // t1 = t1 - 24 * 60 * 60 * 7;    
      
      var endtime = d;
      endtime.setUTCHours(23);
      endtime.setUTCMinutes(0);
      endtime.setUTCSeconds(0);
      t2 = Math.floor(endtime.getTime() / 1000);
      
      return { "t1": t1, "t2": t2 }; 
    }
    
    /**
      * Come up with a sensible number of ticks that is OK on all
      * devices.
      */
    $scope.calcTicks = function(pixels) {
      var count = pixels / 150;
      if (count < 3) count = 3;
      if (count > 12) count = 12;
      return count;
    }
    
    $scope.drawGraph = function(layout, array) {

      var xTickCount = $scope.calcTicks(layout.svg.width);
      var yTickCount = $scope.calcTicks(layout.svg.height);

      // First create suitable D3 objects:

      var x = d3.time.scale()
          .range([0, layout.svg.width]);

      var y = d3.scale.linear()
          .range([layout.svg.height, 0]);

      // Create some axes relating to the scales: 
      var xAxis = d3.svg.axis()
          .scale(x)
          .ticks(xTickCount)
          .tickFormat(d3.time.format('%I:%M %p'))
          .outerTickSize(0)       // Remove meaningless ticks from axis ends.
          .orient("bottom");

      var xGrid = d3.svg.axis()
          .scale(x)
          .ticks(xTickCount)
          .tickSize(-layout.svg.height, 0, 0)
          .tickFormat("")
          .orient("bottom");

      var yAxis = d3.svg.axis()
          .ticks(yTickCount)
          .scale(y)
          .outerTickSize(0)       // Remove meaningless ticks from axis ends.
          .orient("left");

      var yGrid = d3.svg.axis()
          .scale(y)
          .ticks(yTickCount)
          .tickSize(-layout.svg.width, 0, 0)
          .tickFormat("")
          .orient("left");

      // Create the actual graph objects (aka area graph):
      var interpolation = 'monotone';

      var area = d3.svg.area()
          .interpolate(interpolation) 
          .x(function(d) { return x(d.date); })
          .y0(layout.svg.height)
          .y1(function(d) { return y(d.value); });

      var line = d3.svg.line()
          .interpolate(interpolation) 
          .x(function(d) { return x(d.date); })
          .y(function(d) { return y(d.value); })

      // Now create suitable DOM objects:

      var svg = display.reset($scope.mainDivId, layout);

      if (array.length > 0) {
  
        // Tell the scales about the range of data we have got:
        x.domain(d3.extent(array, function(d) { return d.date; }));
        if (pvsettings.data.autoPower)
          y.domain([0, d3.max(array, function(d) { return d.value; })]);
        else
          y.domain([0, pvsettings.data.maxPower]);
  
        // The area graph, behind the grid:
        
        svg.append("path")
            .datum(array)
            .attr("class", "area")
            .attr("d", area);
  
        // Grids behind data:
  
        svg.append("g")         
          .attr("class", "grid")
          .attr("transform", "translate(0," + layout.svg.height + ")")
          .call(xGrid)
  
        svg.append("g")
            .attr("class", "grid")
            .call(yGrid);
  
        // The line graph, in front of the grid:
        
        svg.append("path")
            .datum(array)
            .attr("class", "line")
            .attr("d", line);
            
        svg.selectAll("dot")
          .data(array)
        .enter().append("circle")
          .attr("class", "dot")
          .attr("r", 3)
          .attr("cx", function(d) { return x(d.date); })
          .attr("cy", function(d) { return y(d.value); })
          .append("svg:title")
              .text(function(d) { return d.value.toFixed(3) + " kW generated at\n" + d.date.toTimeString(); });
  
        // Axes in front of graphs:
  
        svg.append("g")
            .attr("class", "y axis")
            .call(yAxis);
            
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + layout.svg.height + ")")
            .call(xAxis);

        // Y axis label:
        var ylabel = "Power (kW)";
        svg.append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            //.attr("y", -layout.margin.left)
            .attr("dy", "1em")
            //.attr("x", -(layout.svg.height)/2 + layout.margin.bottom)
            .attr("x", -(layout.svg.height)/8 + layout.margin.bottom)
            .style("text-anchor", "end")
            .text(ylabel)
  
        $scope.statuselement1 = svg.append("text")
            .attr("x", "30")
            .attr("y", "40")
            .attr("font-size", "15");
      
        $scope.statuselement2 = svg.append("text")
            .attr("x", "30")
            .attr("y", "40")
            .attr("dy", "1.5em")
            .attr("font-size", "15");
            
        if (pvsettings.data.dataSource === 'sample') {
          var s = '(Sample data)';
          var fontSize = 20;
          svg.append("text")
              .attr("x", (layout.svg.width - s.length * fontSize / 2) / 2)
              .attr("y", layout.svg.height / 5)
              .attr("font-size", fontSize)
              .text(s);
        }
      }
    }
    
    $scope.draw = function() {
      var layout = display.layoutScreen("main-container-graph", $scope.mainDivId);
      $scope.drawGraph(layout, $scope.array);
      $scope.writeStatus();
    }

    $scope.writeStatus = function() {
        
      if ($scope.statuselement1) {
        if ($scope.totalAcPower)
          $scope.statuselement1.text("Now: " + $scope.totalAcPower.toFixed(0) + " W");
      }
      if ($scope.statuselement2) {
        if ($scope.yieldStatusData && $scope.yieldStatusData.yieldDaily)
          $scope.statuselement2.text("Today: " + $scope.yieldStatusData.yieldDaily.toFixed(3) + " kWh");
      }
    }

    $scope.array = [];
    
    $scope.refreshGraph = function() {

      // Send an AJAX request for the power data:
      var today = $scope.getDayRange(new Date());
      boschbpts.logAcPower(today.t1, today.t2,
        function onSuccess(response) {
          $scope.$parent.resetStatus();
          var dataobj = response.data; 
          
          // Convert the epoch times to Date objects:
          var temparray = []      // To allow atomic change to $scope.array.
          dataobj.array.forEach(function(d) {
            // The server sometimes sends back 7 day's worth of data for some reason, so
            // filter it here:
            if (pvsettings.data.dataSource === 'sample' 
              || (d.timestamp >= today.t1 && d.timestamp <= today.t2))
            {
              if (d.value > 0) {
                var entry = d;
                entry.date = new Date(d.timestamp * 1000);    // Epoch ms.
                temparray[temparray.length] = entry;
              }
            }
          });
          
          $scope.array = temparray;
          $scope.draw();
  
          // Get fresh status values immediately we have drawn the graph:
          $scope.refreshAcPower();
          $scope.refreshYieldStatus();
          $scope.refreshDcPower();
        },
        function onError(response) {
          $scope.$parent.noResponseError(pvsettings.data.invertorUrl);
        }
      );
    }

    $scope.AcPowerData = {};
    
    $scope.refreshAcPower = function() {
      boschbpts.getAcPower( 
        function(response) {
          $scope.AcPowerData = response.data;
          $scope.totalAcPower = $scope.AcPowerData.powerL1 + $scope.AcPowerData.powerL2 + $scope.AcPowerData.powerL3; 
          
          $scope.writeStatus();
        },
        function() { /* error */ }
      );
    }

    $scope.DcPowerData = {};
    $scope.refreshDcPower = function() {
      boschbpts.getDcPower( 
        function(response) {
          $scope.DcPowerData = response.data;
          $scope.totalDcPower = $scope.DcPowerData.powerA + $scope.DcPowerData.powerB + $scope.DcPowerData.powerC + $scope.DcPowerData.powerD; 
          $scope.writeStatus();
        },
        function() { /* error */ }
      );
    }

    $scope.yieldStatusData = {};
    
    $scope.refreshYieldStatus = function() {
      boschbpts.getYieldStatus(
        function(response) {
          $scope.yieldStatusData = response.data;
          $scope.writeStatus();
        },
        function() { /* error */ }
      );
    }

    $scope.$on('$routeChangeStart', function(next, current) { 
      // Routing is changing away from this view.
      //console.log("routeChangeStart");
      
      angular.element(window).unbind('resize', $scope.draw );
      angular.element(window).unbind('orientationchange', $scope.draw);
      $scope.stopTimers();
    });

    $scope.$on('$routeChangeSuccess', function(next, current) { 
      // Routing has arrived at this view.
      //console.log("routeChangeSuccess");
      
      var datarefreshseconds = 5;
      $scope.$parent.setStatus("Waiting for " + pvsettings.data.invertorUrl + "...");

      // Kick off the updates for this view:
      var stop = [];
      
      $scope.refreshAcPower();
      $scope.refreshDcPower();
      $scope.refreshYieldStatus();
      
      stop.push($interval($scope.refreshYieldStatus, 1000 * datarefreshseconds));
      stop.push($interval($scope.refreshAcPower, 1000 * datarefreshseconds));
      stop.push($interval($scope.refreshDcPower, 1000 * datarefreshseconds));
      $scope.refreshGraph();
      var graphrefreshseconds = 60 * 5;
      stop.push($interval($scope.refreshGraph, 1000 * graphrefreshseconds));
      
      $scope.stop = stop;
      
      angular.element(window).bind('resize', $scope.draw );
      angular.element(window).bind('orientationchange', $scope.draw);
    });

    $scope.stopTimers = function() {
      $scope.stop.forEach( function(s) { $interval.cancel(s); });
    };
    
    $scope.$on('settingsmodified', function() {
      // Do an immediate refresh to use the updated settings:
      $scope.$parent.setStatus("Waiting for " + pvsettings.data.invertorUrl + "...");
      $scope.refreshGraph();
    });
    
  }]);

/******************************************************************/

pvmodule.controller('ChartController',
  [ '$scope', '$http', '$window', '$interval', '$route', 'boschbpts', 'pvsettings', 'display',
  function($scope, $http, $window, $interval, $route, boschbpts, pvsettings, display) {
    
    console.log("ChartController");
    
    $scope.mainDivId = "maindiv-chart";

    
    /**
     * Get the start and end of the day containing the date/time supplied.
     * Limit it to the hours that have any daylight.
     */
    $scope.getWeekRange = function(d) {

      var endtime = d;
      endtime.setUTCHours(23);
      endtime.setUTCMinutes(59);
      endtime.setUTCSeconds(59);
      t2 = Math.floor(endtime.getTime() / 1000);
      
      var secondsPerDay = 24 * 60 * 60;
      t2 -= secondsPerDay;      // Because today's data is not ready until tomorrow. 
      t1 = t2 - 7 * secondsPerDay; 
      
      return { "t1": t1, "t2": t2 }; 
    }

    $scope.drawGraph = function(layout, array) {
      
      // First create suitable D3 objects:
     
      var x = d3.time.scale()
          .range([0, layout.svg.width]);
      
      var y = d3.scale.linear()
          .range([layout.svg.height, 0]);
      
      // We want a tick for each datum:
      var xticklist = [];
      array.forEach(function(datum) {
        // The server gives us the time of the last power generated for each day,
        // it seems. We move that to midday so that the ticks and bars are centred on the
        // day.
        var midday = new Date(datum.date);
        //console.log("date = " + JSON.stringify(datum));
        midday.setUTCHours(12);
        midday.setUTCMinutes(0);
        midday.setUTCSeconds(0);
        xticklist.push(midday);
        datum.midday = midday;
      });
      
      // Create some axes relating to the scales: 
      var xAxis = d3.svg.axis()
          .scale(x)
          //.tickFormat(d3.time.format('%Y-%m-%d'))
          .tickFormat(d3.time.format('%a'))
          .tickValues(xticklist)
          .outerTickSize(0)       // Remove meaningless ticks from axis ends.
          .orient("bottom");
  
      var yAxis = d3.svg.axis()
          .scale(y)
          .outerTickSize(0)       // Remove meaningless ticks from axis ends.
          .orient("left");
          
      var yGrid = d3.svg.axis()
          .scale(y)
          .tickSize(-layout.svg.width, 0, 0)
          .tickFormat("")
          .orient("left");

      // Now create suitable DOM objects:
      
      var svg = display.reset($scope.mainDivId, layout);
      
      if (array.length > 0) {
  
        // Tell the scales about the range of data we have got:
        // x.domain(d3.extent(array, function(d) { return d.midday; }));
        var max = new Date(d3.max(array, function(d) { return d.midday; }));
        max.setUTCHours(23);
        var min = new Date(d3.min(array, function(d) { return d.midday; }));
        min.setUTCHours(0);
        x.domain([min, max]);
        
        if (pvsettings.data.autoEnergy)
          y.domain([0, d3.max(array, function(d) { return d.value; })]);
        else
          y.domain([0, pvsettings.data.maxEnergy]);
  
        svg.append("g")
            .attr("class", "grid")
            .call(yGrid);
  
        var daywidth = layout.svg.width / 3;
        if (array.length > 1) {
          var m1 = array[array.length - 1].midday;
          var x1 = x(m1);
          var m0 = array[0].midday;
          var x0 = x(m0);
          daywidth = (x1 - x0) / (2 * array.length);
        }
        
        svg.selectAll("rect")
          .data(array)
        .enter().append("rect")
          .attr("class", "rect")
          .attr("width", daywidth)
          .attr("height", function(d) { return y(0) - y(d.value); })
          .attr("x", function(d) { return x(d.midday) - daywidth / 2; })
          .attr("y", function(d) { return y(d.value); })
          .append("svg:title")
              .text(function(d) { return d.value.toFixed(3) + " kWh generated on\n" + d.date.toDateString(); });
  
        // Axes in front of graphs:
        svg.append("g")
            .attr("class", "y axis")
            .call(yAxis);
            
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + layout.svg.height + ")")
            .call(xAxis);
  
        // Y axis label:
        var ylabel = "Energy (kWh)";
        svg.append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            //.attr("y", -layout.margin.left)
            .attr("y", 0)
            .attr("dy", "1em")
  //          .attr("x", -(layout.svg.height)/2 + layout.margin.bottom)
            .attr("x", -(layout.svg.height)/8 + layout.margin.bottom)
            .style("text-anchor", "end")
            .text(ylabel)
      }
    }
    
    $scope.draw = function() {
      var layout = display.layoutScreen("main-container-chart", $scope.mainDivId);
      $scope.drawGraph(layout, $scope.array);
    }

    $scope.array = [];
    
    $scope.refreshGraph = function() {

      // Send an AJAX request for the power data:

      var week = $scope.getWeekRange(new Date());
      boschbpts.logAcEnergy(week.t1, week.t2,
        function onSuccess(response) {
          $scope.$parent.resetStatus();
          
          var dataobj = response.data; 
          
          // Convert the epoch times to Date objects:
          var temparray = []      // To allow atomic change to $scope.array.
          dataobj.array.forEach(function(d) {
            var entry = d;
            entry.date = new Date(d.timestamp * 1000);    // Epoch ms.
            entry.value = entry.value / 1000;   // kWh.
            temparray[temparray.length] = entry;
          });

          $scope.array = temparray;
          $scope.draw();

          // Get fresh status values immediately we have drawn the graph:
          $scope.refreshAcPower();
          $scope.refreshYieldStatus();
          $scope.refreshDcPower();
        },
        function onError(response) {
          $scope.$parent.noResponseError(pvsettings.data.invertorUrl);
        }
      );
    }

    $scope.AcPowerData = {};
    
    $scope.refreshAcPower = function() {
      boschbpts.getAcPower( 
        function(response) {
          $scope.AcPowerData = response.data;
          $scope.totalAcPower = $scope.AcPowerData.powerL1 + $scope.AcPowerData.powerL2 + $scope.AcPowerData.powerL3; 
        },
        function() { /* error */ }
      );
      
    }

    $scope.DcPowerData = {};
    
    $scope.refreshDcPower = function() {
      boschbpts.getDcPower( 
        function(response) {
          $scope.DcPowerData = response.data;
          $scope.totalDcPower = $scope.DcPowerData.powerA + $scope.DcPowerData.powerB + $scope.DcPowerData.powerC + $scope.DcPowerData.powerD; 
        },
        function() { /* error */ }
      );
    }

    $scope.yieldStatusData = {};
    
    $scope.refreshYieldStatus = function() {
      boschbpts.getYieldStatus( 
        function(response) {
          $scope.yieldStatusData = response.data;
        },
        function() { /* error */ }
      );
    }

    $scope.$on('$routeChangeStart', function(next, current) { 
      // Routing is changing away from this view.
      angular.element(window).unbind('resize', $scope.draw );
      angular.element(window).unbind('orientationchange', $scope.draw);
    });

    $scope.$on('$routeChangeSuccess', function(next, current) {
      // Routing has arrived at this view.

      $scope.$parent.setStatus("Waiting for " + pvsettings.data.invertorUrl + "...");
      
      var datarefreshseconds = 5;

      $scope.refreshGraph();
      angular.element(window).bind('resize', $scope.draw );
      angular.element(window).bind('orientationchange', $scope.draw);
    });

    
    $scope.$on('settingsmodified', function() {
      // Do an immediate refresh to use the updated settings:
      $scope.$parent.setStatus("Applying new settings " + pvsettings.data.invertorUrl + "...");
      $scope.refreshGraph();
    });

  }]);


pvmodule.controller('HeaderController',
  function($scope, $location, $uibModal, $window, pvsettings) {
    
    console.log("HeaderController");
    
    $scope.isActive = function (viewLocation) { 
      var path = $location.path();
      return viewLocation === path;
    };

    $scope.openSettings = function() {
  
      var modalInstance = $uibModal.open({
        animation: false,
        templateUrl: 'settingsmodal',
        controller: 'SettingsInstanceController',
        size: 'sm',     // can be 'sm' etc
        resolve: {
          settings: function () {
            return pvsettings.data;
          }
        }
      });
  
      modalInstance.result.then(function (newSettings) {
        //console.log("New settings = " + JSON.stringify(newSettings));
        pvsettings.updateSettings(newSettings);
        console.log("broadcasting change of settings");
        $scope.$parent.$broadcast('settingsmodified');
      }, function () {
      });
    };

    console.log("HeaderController done");
  
  });

pvmodule.controller('SettingsInstanceController',
  function ($scope, $uibModalInstance, settings) {

    console.log("SettingsInstanceController");
    
    $scope.settings = angular.copy(settings);
  
    $scope.ok = function () {
      $uibModalInstance.close($scope.settings);
    };
  
    $scope.cancel = function () {
      $uibModalInstance.dismiss('cancel');
    };
  });

pvmodule.controller('BodyController',
  function($scope, $window, $uibModal) {
    
    console.log("BodyController");
    
    $scope.statusModal = null;

    $scope.setStatus = function(msg) {
      $scope.resetStatus();	// In case one is already open.
      $scope.openStatus(msg);
    }
    
    $scope.resetStatus = function() {
      if ($scope.statusModal) {
      	$scope.statusModal.close();
      	$scope.statusModal = null;
      }
    }
    
    $scope.noResponseError = function(invertorUrl) {
      var msg = "Error: no response from  " + invertorUrl + ". Please check your settings.";
      $scope.setStatus(msg);
    }

    $scope.openStatus = function(msg) {
  
      $scope.statusModal = $uibModal.open({
        animation: false,
        templateUrl: 'statusmodal',
        controller: function($scope, $uibModalInstance) {
          $scope.statusMessage = msg;
        },
        size: 'sm',     // can be 'sm' etc
        resolve: {
        }
      });
    };
  });

pvmodule.controller('StatusInstanceController',
  function ($scope, $uibModalInstance) {

    console.log("StatusInstanceController");
  });


pvmodule.controller('StatsController',
  [ '$scope', 'pvsettings', '$interval', 'boschbpts',
  function($scope, pvsettings, $interval, boschbpts) {
    
    console.log("StatsController");
    
    $scope.stats = {};
    $scope.stats.stringA = {};
    $scope.stats.stringB = {};
    $scope.stats.stringC = {};
    $scope.stats.stringD = {};

    $scope.detail = 1;
    
    $scope.refresh = function() {
      var onFailure = function(response) {
        $scope.$parent.setStatus("Failed to read data from " + pvsettings.data.invertorUrl);
      };
      
      // Daisy chain the REST calls, as the inverter doesn't handle concurrent calls
      // very reliably:
      
      var step1 = function() {
        boschbpts.getDcPower(
          function onSuccess(response) {
          	  
            $scope.$parent.resetStatus();

            $scope.DcPowerData = response.data;
            $scope.stats.totalDcPower = $scope.DcPowerData.powerA + $scope.DcPowerData.powerB + $scope.DcPowerData.powerC + $scope.DcPowerData.powerD; 
            $scope.stats.stringA.DcPower = $scope.DcPowerData.powerA; 
            $scope.stats.stringB.DcPower = $scope.DcPowerData.powerB; 
            $scope.stats.stringC.DcPower = $scope.DcPowerData.powerC; 
            $scope.stats.stringD.DcPower = $scope.DcPowerData.powerD; 
            step2();
          },
          onFailure
        );
      };
      
      var step2 = function() {
        boschbpts.getAcPower( 
          function(response) {
            $scope.AcPowerData = response.data;
            $scope.stats.totalAcPower = $scope.AcPowerData.powerL1 + $scope.AcPowerData.powerL2 + $scope.AcPowerData.powerL3; 
            $scope.stats.l1AcPower = $scope.AcPowerData.powerL1; 
            $scope.stats.l2AcPower = $scope.AcPowerData.powerL2; 
            $scope.stats.l3AcPower = $scope.AcPowerData.powerL3; 

            if ($scope.stats.totalDcPower > 50 && $scope.stats.totalAcPower)
              $scope.stats.loss = ($scope.stats.totalDcPower - $scope.stats.totalAcPower) * 100 / $scope.stats.totalDcPower;
            else
              $scope.stats.loss = null;
            
            step3();
          },
          onFailure
        );
      };
      
      var step3 = function() {
        boschbpts.getYieldStatus(
          function(response) {
            $scope.yieldStatusData = response.data;
            $scope.stats.YieldForDay = $scope.yieldStatusData.yieldDaily;
            $scope.stats.YieldForYear = $scope.yieldStatusData.yieldYearly;
            $scope.stats.TotalYield = $scope.yieldStatusData.yieldTotal;
            
            step4();
          },
          onFailure
        );
      };
      
      var step4 = function() {
        boschbpts.getStringVoltageAndCurrent(
          function(response) {
              $scope.stats.stringA.v = response.data.uStringA;          
              $scope.stats.stringA.i = response.data.iStringA;          
              $scope.stats.stringB.v = response.data.uStringB;          
              $scope.stats.stringB.i = response.data.iStringB;          
              $scope.stats.stringC.v = response.data.uStringC;          
              $scope.stats.stringC.i = response.data.iStringC;          
              $scope.stats.stringD.v = response.data.uStringD;          
              $scope.stats.stringD.i = response.data.iStringD;          
  
              step5();
          },
          onFailure
        );
      };

      var step5 = function() {
        boschbpts.getInvertorInfo(
          function(response) {
            $scope.stats.info = response.data;
            
            step6();
          },
          onFailure
        );
      };

      var step6 = function() {
        boschbpts.getGridVoltageAndCurrent(
          function(response) {
            $scope.stats.grid = response.data;
          },
          onFailure
        );
      };

      // Kick off the chain of REST calls:
      step1();
    };
    
    $scope.$on('$routeChangeStart', function(next, current) { 
      // Routing is changing away from this view.
      $scope.stop.forEach( function(s) { $interval.cancel(s); });

    });

    $scope.$on('$routeChangeSuccess', function(next, current) {
      // Routing has arrived at this view.

      $scope.$parent.setStatus("Waiting for " + pvsettings.data.invertorUrl + "...");
      
      // Kick off the updates for this view:
      var stop = [];
      
      $scope.refresh();
      var datarefreshseconds = 10;
      stop.push($interval($scope.refresh, 1000 * datarefreshseconds));
      
      $scope.stop = stop;
    });
    
    $scope.$on('settingsmodified', function() {
      // Do an immediate refresh to use the updated settings:
      $scope.$parent.setStatus("Waiting for " + pvsettings.data.invertorUrl + "...");
      $scope.refresh();
    });
    
  }]);

