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

var pvapp = angular.module('pvapp', [
  "ui.bootstrap",
  "ngRoute",
  "pvmodule"
]);

pvapp.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      // Select on the hash fragment part of the URL
      when('/graph', {
        templateUrl: 'partials/graph.html',
        controller: 'GraphController'
      }).
      when('/chart', {
        templateUrl: 'partials/chart.html',
        controller: 'ChartController'
      }).
      when('/stats', {
        templateUrl: 'partials/stats.html',
        controller: 'StatsController'
      }).
      otherwise({
        redirectTo: '/graph'
      });
  }]);
