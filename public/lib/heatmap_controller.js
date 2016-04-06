var _ = require('lodash');
var module = require('ui/modules').get('heatmap');

module.controller('HeatmapController', function ($scope) {
  $scope.$watch('esResponse', function (resp) {
    if (!resp) {
      $scope.data = null;
      return;
    }

    var columnAggId = _.first(_.pluck($scope.vis.aggs.bySchemaName['columns'], 'id'));
    var rowAggId = _.first(_.pluck($scope.vis.aggs.bySchemaName['rows'], 'id'));
    var metricsAgg = _.first($scope.vis.aggs.bySchemaName['metric']);

    var colFormatter = _.head($scope.vis.aggs.bySchemaName['columns']);
    var rowFormatter = _.head($scope.vis.aggs.bySchemaName['rows']);

    function formatter(value) { return value; }

    colFormatter = colFormatter ? colFormatter.fieldFormatter() : formatter;
    rowFormatter = rowFormatter ? rowFormatter.fieldFormatter() : formatter;

    function aggregate(resp, columnAggId, rowAggId) {
      var columns = resp.aggregations[columnAggId];
      var rows = resp.aggregations[rowAggId];
      var first;

      if (columns) {
        first = columns.buckets;
      } else if (rows) {
        first = rows.buckets;
      } else {
        return [{
          col: '_all',
          row: undefined,
          value: metricsAgg.getValue(resp.aggregations)
        }];
      }

      return first.map(function (bucket) {
        var key = bucket.key;
        var second;

        if (columns && bucket[rowAggId]) {
          second = bucket[rowAggId].buckets;
        } else if (rows && bucket[columnAggId]) {
          second = bucket[columnAggId].buckets;
        }

        if (second) {
          return second.map(function (subBucket) {
            return {
              col: columns ? colFormatter(key) : colFormatter(subBucket.key),
              row: rows ? rowFormatter(key) : rowFormatter(subBucket.key),
              value: metricsAgg.getValue(subBucket)
            };
          });
        }

        return {
          col: columns ? colFormatter(key) : undefined,
          row: rows ? rowFormatter(key) : undefined,
          value: metricsAgg.getValue(bucket)
        };
      });
    }

    function getLabel(agg, name) {
      return agg.bySchemaName[name] ? agg.bySchemaName[name][0].makeLabel() : '';
    }

    var cells = resp.aggregations ? aggregate(resp, columnAggId, rowAggId)
      .reduce(function (a, b) {
        return a.concat(b);
      }, []) : [{
        col: '_all',
        row: undefined,
        value: resp.hits.total
      }];

    debugger;
    _.merge($scope.vis.params, {
      rowAxis: { title: getLabel($scope.vis.aggs, 'rows') },
      columnAxis: { title: getLabel($scope.vis.aggs, 'columns') },
      legendTitle: getLabel($scope.vis.aggs, 'metric')
    });

    $scope.data = [{ cells: cells }];
  });
});
