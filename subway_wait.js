"use strict";

var width = 700;
var height = 600;
var margin = 50;
var transitionTime = 750;

function dateString(d) {
    var m_names = new Array("Jan", "Feb", "Mar","Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec");
    var curr_date  = (d.getDate() < 10)? ("0" + d.getDate()):d.getDate();
    var curr_month = d.getMonth();
    var curr_year  = d.getFullYear();
    return curr_date + "-" + m_names[curr_month] + "-" + curr_year;
}

/*
*- onMouseOver
*	- new position
*	- if disappeared then bring it back
*	- if somewhere else then bring it to correct position with new data
*- onMouseOut
*	- fade-out and then remove
*/
function createInfobox (context) {
	var chartId = context.chartId;
	var svgId = context.chartSvgId;
	var labelId = context.labelChartId;

	var infoBox = {};
	var infoboxID = 'chart_infobox';
	var height = 50, width = 120;
	function calcNewPosition(xPos, yPos) {
		var pos = {"x":(xPos-(width/2)), "y":(yPos-(height+5))};
		return pos;
	}
	
	function getInfoElementData(element) {
		var elementData = d3.select(element).data()[0];
		elementData.color = element.style.fill;
		return elementData;
	}

	infoBox.setNewPosition = function  (element) {
		var newPos = calcNewPosition(element.cx.baseVal.value, element.cy.baseVal.value);
		var infoElement = d3.select('#' + chartId).select('#' + svgId)
			.select('#chart_infobox').node();
		var rectInfoElement = 0, textInfoElementLine1 = 0, textInfoElementLine2=0;		

		if(infoElement == null) {
			infoElement = d3.select('#' + chartId).select('#' + svgId)		
							.append('g')
							.attr('id', 'chart_infobox')
							.attr('opacity', 0)
							.attr('transform', 'translate(' + newPos.x + ',' + newPos.y + ')');

			rectInfoElement = infoElement.append('rect')
								.attr('x', 0)
								.attr('y', 0)
								.attr('width', width)
								.attr('height', height)								
								.attr('fill', 'white')
								.attr('opacity', 0.7)
								
			textInfoElementLine1 = infoElement.append('text')
								.attr('x', 10)
								.attr('y', 20)																
								.attr('fill', 'black')
								.attr('id', "line1");

			textInfoElementLine2 = infoElement.append('text')
								.attr('x', 10)
								.attr('y', 40)										
								.attr('fill', 'black')
								.attr('id', "line2");
		} else {
			infoElement = d3.select(infoElement);
			rectInfoElement = infoElement.select('rect');
			textInfoElementLine1 = infoElement.select('text#line1');
			textInfoElementLine2 = infoElement.select('text#line2');
		}

		
		var infoElementData = getInfoElementData(element);
		textInfoElementLine1.text(dateString(new Date(infoElementData.time)));
		textInfoElementLine2.text(infoElementData.late_percent + "%  ," + infoElementData.line_name);
		
		infoElement.transition()
					.duration(500)
					.attr('transform', 'translate(' + newPos.x + "," + newPos.y + ')')
					.attr('opacity', 1);

		rectInfoElement.transition()
					.duration(500)
					.attr('fill', infoElementData.color)

	}

	infoBox.fadeOut = function  (element) {
		var infoElement = d3.select('#' + chartId).select('#' + svgId)
			.select('#chart_infobox').node();

		if(infoElement != null) {
			d3.select(infoElement).transition()
					.delay(1000)
					.duration(1000)					
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

function rgb2hex(rgb) {
    rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);

    function hex(x) {
        return ("0" + parseInt(x).toString(16)).slice(-2);
    }
    return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
}

function createChartElements(context) {
    d3.select('#' + context.chartId).remove();
    var divChart = d3.select('body')
        .append("div")
        .attr('id', context.chartId)
        .attr('class', 'chart');

    divChart.append('svg')
        .attr('id', context.chartSvgId)
        .attr('class', 'chart_svg');

    var chartLabel = divChart.append('div')
        .attr('id', context.labelChartId)
        .attr('class', 'chart_label');

    chartLabel.append('form')
        .attr('id', context.labelChartId)
        .attr('class', 'chart_form');
}

function createLineData(data) {
    var lineData = {};
    for (var i = 0; i < data.length; i++) {
        var lineId = data[i].line_id;
        if (typeof(lineData[lineId]) == "undefined") {
            lineData[lineId] = [];
        }
        lineData[lineId].push(data[i]);
    };
    for (var i in lineData) {
        lineData[i].sort(function(a, b) {
            return (a.time - b.time);
        });
    }
    return lineData;
}

function redrawPoints(context) {
    var paths = d3.select('#' + context.chartId).select('#' + context.chartSvgId)
        .selectAll("path.dot_joining_line");

        paths.transition()        
        .duration(transitionTime)
        .attr("d", function(d) {return context.line(d);} );

    var circles = d3.select('#' + context.chartId).select('#' + context.chartSvgId)
        .selectAll("circle.data_point");

    circles.transition()
        .duration(transitionTime)
        .attr('cx', function(d) {
            return context.axisObj.timeScale(new Date(d.time));
        })
        .attr('cy', function(d) {
            return context.axisObj.percentageScale(d.late_percent);
        });
}

function changeZoomLevel(context,zoomLevel) {
	context.axisObj = constructAxis(context,zoomLevel);
	redrawPoints(context);
}

function drawPoints(context, categoryName, newCategoryColor) {
    var lineTransitionTime = 750,
        pointTransitionTime = 250;
    var lineDataLength = context.lineData[categoryName].length;
    var lineBefore = d3.svg.line()
        .x(function(d) {
            return context.axisObj.timeScale(d.time)
        })
        .y(function(d) {
            return (height - margin);
        });

    var line = d3.svg.line()
        .x(function(d) {
            return context.axisObj.timeScale(d.time)
        })
        .y(function(d) {
            return context.axisObj.percentageScale(d.late_percent)
        });
    context.line = line;
    var pathData = [context.lineData[categoryName]];
    d3.select('#' + context.chartId).select('#' + context.chartSvgId)
    	.selectAll('path#' + categoryName)
    	.data(pathData)
    	.enter()
        .append("path")
        .attr("id", categoryName)
        .attr("class", 'dot_joining_line')
        .attr("d", function(d) { return lineBefore(d);})
        .transition()
        .delay(pointTransitionTime)
        .duration(lineTransitionTime)
        .attr("d", function(d) { return line(d); })
        .style('stroke', newCategoryColor);

    d3.select('#' + context.chartId).select('#' + context.chartSvgId)
        .selectAll("circle." + categoryName)
        .data(context.lineData[categoryName])
        .enter().append('circle')
        .attr('r', 0)
        .style('fill', 'white')
        .attr('cx', function(d) {
            return context.axisObj.timeScale(new Date(d.time));
        })
        .attr('cy', function(d) {
            return context.axisObj.percentageScale(d.late_percent);
        })        
        .attr('class', categoryName+" data_point")
        .on('mouseover', function(d, i) {
            d3.select(this)
            	.transition()
                .attr('r', 8);
            context.infoBox.setNewPosition(this);
        })
        .on('mouseout', function(d, i) {
            d3.select(this)
            	.transition()
                .attr('r', 5);            
            context.infoBox.fadeOut(this);
        })
        .transition()
        .delay(function(d, i) {
            return i * (pointTransitionTime / lineDataLength);
        })        
        .duration(pointTransitionTime)
        .style('fill', newCategoryColor)
        .each('start',function(){ d3.select(this).attr('r',5); });        
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

function constructLabels(context) {
    var lineDataKeys = Object.keys(context.lineData);
    var colors = d3.scale.category10().domain(d3.range(0, 10));
    var divContainers = d3.select("form#" + context.labelChartId)
        .selectAll('div#checkbox_container')
        .data(lineDataKeys)
        .enter()
        .append('div')
        .attr('id', "checkbox_container");

    d3.select("form#" + context.labelChartId).append('div')
    	.append('button')
        .text('Uncheck All')
        .attr('type', 'button')
        .on('click', function(e, i) {
            context.colorPallete.reset();
            d3.select(this.parentNode.parentNode).selectAll('input').each(function(d, i) {
                this.checked = false;
                d3.select(this.parentNode).select('span.colorLabel').style('background-color', 'white');
                removePoints(context, this.value);
            })
        });

    d3.select("form#" + context.labelChartId).append('div')
    	.append('button')
    	.attr('id', 'zoom_in')
        .text('Zoom In - 10%')
        .attr('type', 'button')
        .on('click', function(e, i) {
            context.zoomLevel -= 0.1;
            if(context.zoomLevel <= 0.15)
            	this.disabled = true;
            changeZoomLevel(context,context.zoomLevel);
        });

    d3.select("form#" + context.labelChartId).append('div')
    	.append('button')
        .text('Zoom Out - 10%')
        .attr('type', 'button')
        .on('click', function(e, i) {
        	if(context.zoomLevel >= .1) {
        		d3.select("form#" + context.labelChartId).select('#zoom_in').node().disabled = false;
        	}
			context.zoomLevel += .1;
           	changeZoomLevel(context,context.zoomLevel); 
        });

	d3.select("form#" + context.labelChartId).append('div')
    	.append('button')
        .text('Zoom Reset')
        .attr('type', 'button')
        .on('click', function(e, i) {
        	d3.select("form#" + context.labelChartId).select('#zoom_in').node().disabled = false;
			context.zoomLevel = 1;
			changeZoomLevel(context,context.zoomLevel);  
        });    

    divContainers.append('input')
        .attr('type', "checkbox")
        .attr('name', "line_name")
        .attr('value', function(d) {
            return d;
        })
        .on('click', function(e, i) {
            var categoryName = this.value;
            if (this.checked) {
                var newCategoryColor = context.colorPallete.nextColor();
                if (newCategoryColor == null) {
                    this.checked = false;
                    return;
                }
                d3.select(this.parentNode).select('span.colorLabel').style('background-color', newCategoryColor);
                drawPoints(context, categoryName, newCategoryColor);
            } else {
                var colorToBeFreed = rgb2hex(d3.select(this.parentNode).select('span.colorLabel').node().style.backgroundColor);
                context.colorPallete.markUnused(colorToBeFreed);
                d3.select(this.parentNode).select('span.colorLabel').style('background-color', 'white');
                removePoints(context,categoryName);
            }
        });

    divContainers.append('span')
        .attr('id', function(d) {
            return d;
        })
        .attr('class', 'colorLabel');

    divContainers.append('span')
        .html(function(d) {
            return (context.lineData[d])[0].line_name;
        })
        .attr('id', function(d) {
            return d;
        })
}

function createColorPallete() {
    var colors = d3.scale.category10().domain(d3.range(0, 10));
    var freeColors = new Array(10);
    var a = {};
    a.nextColor = function() {
        for (var i = 0; i < 10; i++) {
            if (freeColors[i] === 0) {
                freeColors[i] = 1;
                return colors(i);
            }
        };
        return null;
    };
    a.reset = function() {
        for (var i = freeColors.length - 1; i >= 0; i--) {
            freeColors[i] = 0;
        };
    }
    a.markUnused = function(colorCode) {
        if (typeof(colorCode) == 'string') {
            for (var i = 0; i < 10; i++) {
                if (colors(i) === colorCode) {
                    freeColors[i] = 0;
                    return true;
                }
            };
        } else {
            if ((colorCode >= 0) && (colorCode < 10)) {
                freeColors[colorCode] = 0;
                return true;
            }
        }
        return false;
    };
    a.reset();
    return a;
}
//zoomInPercentage = 1 means 100% zoom, 0.5 means 200% zoom, 2 means 50%
function constructAxis(context,zoomInPercentage) {
    var minDate = new Date(2100, 1, 1),
        maxDate = new Date(0),
        minPercentage = 100,
        maxPercentage = 0;
    for (var i = context.data.length - 1; i >= 0; i--) {
        if (minPercentage > context.data[i].late_percent) {
            minPercentage = context.data[i].late_percent;
        }

        if (maxPercentage < context.data[i].late_percent) {
            maxPercentage = context.data[i].late_percent;
        }        

        if (minDate > new Date(context.data[i].time)) {
            minDate = new Date(context.data[i].time)
        }

        if (maxDate < new Date(context.data[i].time)) {
            maxDate = new Date(context.data[i].time)
        }
    };

    //adjust zoom with late_percentage.
    var diffPercentage = maxPercentage - minPercentage;
    maxPercentage = minPercentage + (diffPercentage * zoomInPercentage);

    //adjust zoom with time.
    var diffTime = maxDate.getTime() - minDate.getTime();
    maxDate = new Date( minDate.getTime() + (diffTime * zoomInPercentage) );

    var timeScale = d3.time.scale()
        .domain([minDate, maxDate])
        .range([margin, width - margin]);

    var percentageScale = d3.scale.linear()
        .domain([minPercentage, maxPercentage])
        .range([height - margin, margin]);

    var axisObj = {
        "timeScale": timeScale,
        "percentageScale": percentageScale
    };

    var xAxis = d3.svg.axis()
        .scale(timeScale);

    var yAxis = d3.svg.axis()
        .scale(percentageScale)
        .orient("left");

    var gXAxis = 0, gYAxis = 0;
    gXAxis = d3.select("#" + context.chartSvgId).select("g#x_axis");
    if(gXAxis.node() == null) {
    	gXAxis = d3.select("#" + context.chartSvgId)
        .append("g")
        .attr("transform", "translate(0," + (height - margin) + ")")
        .attr('class', "x axis")
        .attr('id', 'x_axis')
        .call(xAxis);
    } else {
    	gXAxis.transition()
    	.duration(transitionTime)
        .call(xAxis);
    }
     
    gYAxis = d3.select("#" + context.chartSvgId).select("g#y_axis");
    if(gYAxis.node() == null) {
    	gYAxis = d3.select("#" + context.chartSvgId)
    	    .append("g")
    	    .attr("transform", "translate(" + margin + ",0)")
    	    .attr('class', "y axis")
    	    .attr('id', 'y_axis')
    	    .call(yAxis);
    } else {
    	gYAxis.transition()
    	.duration(transitionTime)
        .call(yAxis);
    }

    if(gXAxis.select("#x_axis_label").node() == null) {
	    gXAxis.append("text")
	    	.attr('font-weight','bold')
	        .text("Time")
	        .attr("x", function() {
	            return (width / 1.6) - margin
	        })
	        .attr("y", margin / 1.5)
	        .attr('class', 'x_axis_label')
	        .attr('id', 'x_axis_label');
	    
	    gYAxis.append("text")
	        .text("Weight Percentage")
	        .attr('font-weight','bold')
	        .attr("transform", "rotate (270, " + 150 + ", 180)")
	        .attr("x", margin / 1.5)
	        .attr("y", 0)
	        .attr('class', 'y_axis_label')
	        .attr('id', 'y_axis_label');
	}
    return axisObj;
}

function draw(data) {    
    var context = {};
    context.zoomLevel = 1;
    context.data = data;
    context.lineData = createLineData(data);
    context.chartId = 'chart';
    context.chartSvgId = 'chart_svg';
    context.labelChartId = 'label_svg';

    createChartElements(context);
    context.axisObj = constructAxis(context,1);
    context.infoBox = createInfobox (context);
    context.colorPallete = createColorPallete();
    constructLabels(context);
}

$(function() {
    d3.json("subway_wait.json", draw);
});