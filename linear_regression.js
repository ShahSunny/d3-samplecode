"use strict";

(function()
{
	function createStat() {
		var stat = {};
		function sumReduce(sum,val) { sum += val; return sum;};

		stat.mean = function (arr) {
			var sum = arr.reduce(sumReduce,0);
			return sum/arr.length;
		};
		stat.varianceSum = function(arr,mean) {
			if(typeof(mean) == "undefined") {
				mean = stat.mean(arr);
			}
			var varianceSum = arr.reduce(function (variance,val) {
				variance += Math.pow((mean - val),2);
				return variance;
			},0);
			return varianceSum;
		}
		stat.variance = function (arr,mean) {			
			var varianceSum = stat.varianceSum(arr,mean);
			var variance = varianceSum/arr.length;
			return variance;
		};

		stat.sd = function (arr,mean) {
			var variance = stat.variance(arr,mean);
			var sd  = Math.pow(variance,0.5);
			return sd;
		}
		
		function calculateRSS(xData,yData,regressionObj) {			
			var rss =  xData.reduce(function (rss,v,i) {
				var py = regressionObj.intercept + regressionObj.slope * v;
				rss += Math.pow(py - yData[i],2);
				return rss;			
			},0);
			return rss;
		}

		function calculatePredictorError(xData,yData,regressionObj) {			
			var rse = Math.pow(regressionObj.rss/(xData.length-2),0.5);
			var xMeanSquare = Math.pow(regressionObj.xAvg,2);
			var varianceSum = stat.varianceSum(xData,regressionObj.xAvg);
			regressionObj.seB0 = rse * ((1/xData.length) + (xMeanSquare/varianceSum));
			regressionObj.seB1 = rse/varianceSum;
			regressionObj.rse = rse;
		}

		stat.calcLinearRegression = function (xData,yData) {            
			var xAvg = 0, yAvg = 0;
			var regressionObj= {};
            regressionObj.xAvg = xAvg = stat.mean(xData);
            regressionObj.yAvg = yAvg = stat.mean(yData);

            var diffMultiSum = 0, diffXSquareSum = 0;
            for (var i = xData.length - 1; i >= 0; i--) {
                diffMultiSum += (xData[i] - xAvg) * (yData[i] - yAvg);
                diffXSquareSum += Math.pow((xData[i] - xAvg), 2);
            };

            regressionObj.slope  = diffMultiSum / diffXSquareSum;
        	regressionObj.intercept = yAvg - regressionObj.slope * xAvg;
        	regressionObj.rss = calculateRSS(xData,yData,regressionObj);
        	calculatePredictorError(xData,yData,regressionObj);
            return regressionObj;
		}
		
		return stat;
	}
	window.Stat = createStat();
})();


/*
*- onMouseOver
*	- new position
*	- if disappeared then bring it back
*	- if somewhere else then bring it to correct position with new data
*- onMouseOut
*	- fade-out and then remove
*/
function createInfobox (context,width,height) {
	var chartId = context.id;

	var infoBox = {};
	var infoboxID = 'chart_infobox';	
	function calcNewPosition(xPos, yPos) {
		var pos = {"x":(xPos-(width/2)), "y":(yPos-(height+10))};
		return pos;
	}
	
	function getInfoElementData(element) {
		var elementData = d3.select(element).data()[0];		
		return elementData;
	}

	infoBox.setNewPosition = function  (element) {
		var newPos = calcNewPosition(element.cx.baseVal.value, element.cy.baseVal.value);
		var infoElement = d3.select('#' + chartId).select('#chart_infobox').node();
		var rectInfoElement = 0, textInfoElementLine1 = 0;		

		if(infoElement == null) {
			infoElement = d3.select('#' + chartId)
							.append('g')
							.attr('id', 'chart_infobox')
							.attr('opacity', 0)
							.attr('transform', 'translate(' + newPos.x + ',' + newPos.y + ')');

			rectInfoElement = infoElement.append('rect')
								.attr('x', 0)
								.attr('y', 0)
								.attr('width', width)
								.attr('height', height)								
								.attr('fill', 'blue')
								.attr('opacity', 0.8)
								
			textInfoElementLine1 = infoElement.append('text')
								.attr('x', 10)
								.attr('y', 20)																
								.attr('fill', 'white')
								.attr('id', "line1");

		} else {
			infoElement = d3.select(infoElement);
			rectInfoElement = infoElement.select('rect');
			textInfoElementLine1 = infoElement.select('text#line1');			
		}

		var infoElementData = getInfoElementData(element);
		textInfoElementLine1.text("( " + infoElementData.x + " , " + infoElementData.y + " )");		
		
		infoElement.transition()
					.duration(context.transitionTime)
					.attr('transform', 'translate(' + newPos.x + "," + newPos.y + ')')
					.attr('opacity', 1);

	}

	infoBox.fadeOut = function  (element) {
		var infoElement = d3.select('#' + chartId)
							.select('#chart_infobox').node();

		if(infoElement != null) {
			d3.select(infoElement).transition()					
					.duration(500)					
					.attr('opacity', 0)
					.remove();
		}
	}
	return infoBox;
}

d3.selection.prototype.interrupt = function() {
    return this.each(function() {
        var lock = this.__transition__;
        if (lock) {
            var active = -1;
            for (var id in lock)
                if ((id = +id) > active) active = id;
            lock.active = active + 1;
        }
    });
};

function createChartElements(context) {
    d3.select('body').select('#' + context.id).remove();
    
    d3.select('body')
        .append("svg")
        .attr('id', context.id)
        .attr('class', 'chart')
        .attr('width', context.width)
        .attr('height', context.height);
}

function removePoints(context, categoryName) {
    d3.select('#' + context.chartId).select('#' + context.chartSvgId)
        .selectAll("circle." + categoryName)
        .interrupt()
        .remove();

    d3.select('#' + context.chartId).select('#' + context.chartSvgId)
        .selectAll("path#" + categoryName)
        .interrupt()
        .remove();
}

function constructAxis(context) {    
    var xScale = d3.scale.linear()
        .domain([0, context.xEnd])
        .range([context.margin, context.width - context.margin]);

    var yScale = d3.scale.linear()
        .domain([0, context.yEnd])
        .range([context.height - context.margin, context.margin]);

    var axisObj = {
        "xScale": xScale,
        "yScale": yScale
    };

    var xAxis = d3.svg.axis()
        .scale(xScale);

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient("left");

    var gXAxis = 0, gYAxis = 0;
    gXAxis = d3.select("#" + context.id).select("g#x_axis");
    if(gXAxis.node() == null) {
    	gXAxis = d3.select("#" + context.id)
        .append("g")
        .attr("transform", "translate(0," + (context.height - context.margin) + ")")
        .attr('class', "x axis")
        .attr('id', 'x_axis')
        .call(xAxis);
    } else {
    	gXAxis.transition()
    	.duration(context.transitionTime)
        .call(xAxis);
    }
     
    gYAxis = d3.select("#" + context.id).select("g#y_axis");
    if(gYAxis.node() == null) {
    	gYAxis = d3.select("#" + context.id)
    	    .append("g")
    	    .attr("transform", "translate(" + context.margin + ",0)")
    	    .attr('class', "y axis")
    	    .attr('id', 'y_axis')
    	    .call(yAxis);
    } else {
    	gYAxis.transition()
    	.duration(context.transitionTime)
        .call(yAxis);
    }

    if(gXAxis.select("#x_axis_label").node() == null) {
	    gXAxis.append("text")
	    	.attr('font-weight','bold')
	        .text("X Axis")
	        .attr("x", function() {
	            return (context.width / 1.6) - context.margin;
	        })
	        .attr("y", context.margin / 1.5)
	        .attr('class', 'x_axis_label')
	        .attr('id', 'x_axis_label');
	    
	    gYAxis.append("text")
	        .text("Y Axis")
	        .attr('font-weight','bold')
	        .attr("transform", "rotate (270, " + 150 + ", 180)")
	        .attr("x", context.margin / 1.5)
	        .attr("y", 0)
	        .attr('class', 'y_axis_label')
	        .attr('id', 'y_axis_label');
	}

  // <defs>
  //     <clipPath id="clipPath">
  //         <rect x="15" y="15" width="40" height="40" />
  //     </clipPath>
  // </defs>
  	d3.select("#" + context.id).selectAll("defs").remove();  	
	
  	var clipPathAxis = d3.select("#" + context.id)
  							.append('defs')
  							.append('clipPath')
  							.attr('id', "axis");
	clipPathAxis.append('rect')
		.attr('x', xScale(0))
		.attr('y', yScale(context.yEnd))
		.attr('width', xScale(context.xEnd) - xScale(0))
		.attr('height', yScale(0) - yScale(context.yEnd));
	d3.select("body").select("p#rss").remove();
	d3.select("body").append("p").attr('id', 'rss');
    return axisObj;
}

function calculateLineData(context) {
	
    var xData = context.data.map(function(v) { return v.x; });
    var yData = context.data.map(function(v) { return v.y; });
    var lineObj = Stat.calcLinearRegression(xData, yData);
    lineObj.x1 = 0;
    lineObj.x2 = context.xEnd;
    lineObj.y1 = lineObj.intercept + lineObj.slope * lineObj.x1;
    lineObj.y2 = lineObj.intercept + lineObj.slope * lineObj.x2;
	
	return lineObj;
}

function updateLine(context) {
	var lineData = [];
	if(context.data.length > 1) {
		var lineObj = calculateLineData(context);		
		lineData.push(lineObj);
		var lrString = " <b>B0 = </b> " + Math.round(lineObj.intercept) 
						+ " <b>B1 = </b> " + Math.round(lineObj.slope*100)/100
						+ " <b>RSS = </b> " + Math.round(lineObj.rss) 
						+ " <b>RSE = </b> " + Math.round(lineObj.rse) 
						+ " ;<b>B0 Error = </b>" + Math.round(lineObj.seB0*10000)/10000 
						+ " <b>;B1 Error = </b>" + Math.round(lineObj.seB1*10000)/10000;
		d3.select('body').select('p#rss').html(lrString);

	} else {
		d3.select('body').select('p#rss').text("");
	}
	//<line x1="0" y1="0" x2="200" y2="200"  />
	var elements = d3.select('#'+context.id)
		.selectAll('line.linear_regression')		
		.data(lineData)
		.attr('class', 'linear_regression')
		.attr('x1', function(d) {return context.axisObj.xScale(d.x1);})
		.attr('y1', function(d) {return context.axisObj.yScale(d.y1);})
		.attr('x2', function(d) {return context.axisObj.xScale(d.x2);})
		.attr('y2', function(d) {return context.axisObj.yScale(d.y2);})
		.attr('clip-path', 'url(#axis)')
		.attr('stroke-width', 10);
		//clip-path: url(#clipPath); "
	elements.enter().append('line')
		.attr('x1', function(d) {return context.axisObj.xScale(d.x1);})
		.attr('y1', function(d) {return context.axisObj.yScale(d.y1);})
		.attr('x2', function(d) {return context.axisObj.xScale(d.x2);})
		.attr('y2', function(d) {return context.axisObj.yScale(d.y2);})
		.attr('style',"stroke:rgb(200,200,200);stroke-width:2")
		.attr('class', 'linear_regression')
		.attr('clip-path', 'url(#axis)')
		.attr('stroke-width', 10);
	elements.exit().remove();
}

function drawData(context) {
	d3.select('#'+context.id)
		.selectAll('circle.data_point')		
		.data(context.data)
		.attr('cx', function(d) {return context.axisObj.xScale(d.x);})
	    .attr('cy', function(d) {return context.axisObj.yScale(d.y);})
		.enter().append('circle')
		    .attr('cx', function(d) {return context.axisObj.xScale(d.x);})
		    .attr('cy', function(d) {return context.axisObj.yScale(d.y);})
		    .attr('r', 4)
		    .attr('class', 'data_point')
		    .style('fill', '#000')
		    .on('mouseover', function(d) { 
		    	d3.select(this).transition().attr('r', 9);
		    	context.infoBox.setNewPosition(this); })
		    .on('mouseout', function(d)  {
		    	d3.select(this).transition().attr('r', 4);
		    	context.infoBox.fadeOut(this); })
		    .on('click', function(d,i){
		    	if(d3.event.ctrlKey) {
		    		var index = context.data.indexOf(d);
		    		console.log(index);
		    		if(index > -1) {
		    			context.data.splice(index, 1);		    			
		    			drawData(context);
		    		}
		    		
		    	}});

	d3.select('#'+context.id)
		.selectAll('circle.data_point')
		.data(context.data)
		.exit().remove()

	updateLine(context);
}

function constructDrawingArea(context) {
	d3.select('#'+context.id).append('rect')
		.attr('x', context.margin)
		.attr('y', context.margin)
		.attr('width', context.xEnd  )
		.attr('height', context.yEnd )
		.attr('fill', 'white')
		.attr('stroke', 'grey')
		.attr('stroke-opacity', 0.5)
		.on('click', function() {
			var coordinates = [0, 0];
			coordinates = d3.mouse(this);
			var x = coordinates[0];
			var y = Math.round(coordinates[1]);
			var data = {'x':Math.round(context.axisObj.xScale.invert(x)), 
						'y':Math.round(context.axisObj.yScale.invert(y))}
			context.data.push(data);
			drawData(context);	})
}

function init (context) {
	context.width = 1000;
	context.height = 600;
	context.margin = 50;

	context.xEnd = context.width -  2* context.margin;
	context.yEnd = context.height - 2*context.margin;

	context.transitionTime = 750;    
    context.data = [];
    context.id = 'chart_svg';
}

function draw() {    
    var context = {};
    init(context);
    createChartElements(context);
    context.axisObj = constructAxis(context);
    context.infoBox = createInfobox(context,100,30);
    constructDrawingArea(context);
    // context.colorPallete = createColorPallete();
    // constructLabels(context);
}

$(function() {
    draw();
});