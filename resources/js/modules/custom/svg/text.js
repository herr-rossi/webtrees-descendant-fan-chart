/**
 * This file is part of the package magicsunday/webtrees-fan-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file that was distributed with this source code.
 *
 * This file was updated by herr--rossi (hr).
 */

import * as d3 from "../../lib/d3";
import Geometry, { MATH_DEG2RAD, MATH_RAD2DEG } from "./geometry";
import measureText from "../../lib/chart/text/measure"

/**
 * The class handles all the text and text path elements.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-fan-chart/
 */
export default class Text {
    /**
     * Constructor.
     *
     * @param {Svg}           svg
     * @param {Configuration} configuration The application configuration
     */
    constructor(svg, configuration) {
        this._svg = svg;
        this._configuration = configuration;
        this._geometry = new Geometry(this._configuration);
    }

    /**
     * Creates all the labels and all dependent elements for a single person.
     *
     * @param {selection} parent The parent element to which the elements are to be attached
     * @param {Object}    datum  The D3 data object
     */
    createLabels(parent, datum) {
        // Define label content
        const nameGroups = this.createNamesData(datum);

        const timeSpan = datum.data.data.timespan !== "" ? [[{
            label: datum.data.data.timespan,
            isPreferred: false,
            isLastName: false,
            isNameRtl: datum.data.data.isNameRtl,
            isDate: true
        }]] : [];

        const birthPlace = datum.data.data.birthPlaceDescription !== "" ? [[{
            label: datum.data.data.birthPlaceDescription,
            isPreferred: false,
            isLastName: false,
            isNameRtl: datum.data.data.isNameRtl,
            //isDate: true
            isPlace: true
        }]] : [];

        // Define label lines content
        let labelLines = [];

        // Labels along arc (four lines)
        if (this.isLabelAlongArc(datum)) {
            labelLines = [].concat(nameGroups, timeSpan, birthPlace);
        }

        // Radial labels
        else {

            // Very narrow labels (one line)
            if (this._geometry.arcLength(datum, 1) <= 30 && datum.depth > 0) {
                const [first, ...last] = nameGroups;
                // Merge the firstname and lastname groups, timespan and birthplace, as we display the whole name and addtional info in one line
                const labelLine = [].concat(
                    first,
                    typeof last[0] !== "undefined" ? last[0] : [],
                    typeof timeSpan[0] !== "undefined" ? timeSpan[0] : [],
                    typeof birthPlace[0] !== "undefined" ? birthPlace[0] : []);
                labelLines = [labelLine];
            }

            // Narrow labels (two lines)
            else if (this._geometry.arcLength(datum, 1) <= 50 && datum.depth > 0) {
                const [first, ...last] = nameGroups;
                // Merge the firstname and lastname groups, as we display the whole name in one line
                const labelLine1 = [].concat(first, typeof last[0] !== "undefined" ? last[0] : []);
                // Merge the timespan and birthplace, as we display the addtional info in one line
                const labelLine2 = [].concat(
                    typeof timeSpan[0] !== "undefined" ? timeSpan[0] : [],
                    typeof birthPlace[0] !== "undefined" ? birthPlace[0] : []);
                labelLines = [].concat([labelLine1], [labelLine2]);
            }

            // Medium wide lables (three lines)
            else if (this._geometry.arcLength(datum, 1) <= 70 && datum.depth > 0) {
                const labelLine3 = [].concat(
                    typeof timeSpan[0] !== "undefined" ? timeSpan[0] : [],
                    typeof birthPlace[0] !== "undefined" ? birthPlace[0] : []);
                labelLines = [].concat(nameGroups, [labelLine3]);
            }

            // Wide lables and inner circle (four lines)
            else if (this._geometry.arcLength(datum, 1) > 70 || datum.depth == 0) {
                labelLines = [].concat(nameGroups, timeSpan, birthPlace);
            }
        }

        // Append labels
        const numberOfLines = labelLines.length;
        // Labels along arc
        if (this.isLabelAlongArc(datum)) {
            const parentId = d3.select(parent.node().parentNode).attr("id");

            // The textPath element must be contained individually in a text element, otherwise the exported
            // chart will not be drawn correctly in Inkscape (actually this is not necessary, the browsers
            // display the chart correctly).

            labelLines.forEach((labelLine, index) => {
                const pathId = this.createPathDefinition(parentId, index, datum, numberOfLines);
                const textPath = parent
                    .append("text")
                    .append("textPath")
                    .attr("xlink:href", "#" + pathId)
                    .attr("startOffset", "25%");

                this.addLabelElements(textPath, labelLine);
            });

            // Set optimised font size
            let labelFontSize = this.setFontSize(parent, datum, numberOfLines);
        }

        // Radial labels
        else {
            labelLines.forEach((labelLine, index) => {
                const text = parent
                    .append("text");

                this.addLabelElements(text, labelLine);
            });

            // Set optimised font size
            let labelFontSize = this.setFontSize(parent, datum, numberOfLines);

            // Transform radial labels and centre circle label in the right position
            this.transformText(parent, datum, labelFontSize);
        }
    }

    /**
     * Creates the data array for the names in top/bottom layout.
     *
     * @param {NameElementData} datum
     *
     * @return {LabelElementData[][]}
     *
     * @private
     */
    createNamesData(datum) {
        /** @var {LabelElementData[][]} names */
        let names = {};
        /** @var {LabelElementData[]} firstnames */
        let firstnames = {};
        /** @var {LabelElementData[]} lastnames */
        let lastnames = {};
        let minPosFirstnames = Number.MAX_SAFE_INTEGER;
        let minPosLastnames = Number.MAX_SAFE_INTEGER;

        let firstnameOffset = 0;
        let firstnameMap = new Map();

        // Iterate over the individual name components and determine their position in the overall
        // name and insert the component at the corresponding position in the result object.
        for (let i in datum.data.data.firstNames) {
            const pos = datum.data.data.name.indexOf(datum.data.data.firstNames[i], firstnameOffset);

            if (pos !== -1) {
                firstnameOffset = pos + datum.data.data.firstNames[i].length;

                if (pos < minPosFirstnames) {
                    minPosFirstnames = pos;
                }

                firstnameMap.set(
                    pos,
                    {
                        label: datum.data.data.firstNames[i],
                        isPreferred: datum.data.data.firstNames[i] === datum.data.data.preferredName,
                        isLastName: false,
                        isNameRtl: datum.data.data.isNameRtl
                    }
                );
            }
        }

        names[minPosFirstnames] = [...firstnameMap].map(([, value]) => (value));

        let lastnameOffset = 0;
        let lastnameMap = new Map();

        for (let i in datum.data.data.lastNames) {
            let pos;

            // Check if last name already exists in first names list, in case first name equals last name
            do {
                pos = datum.data.data.name.indexOf(datum.data.data.lastNames[i], lastnameOffset);

                if ((pos !== -1) && firstnameMap.has(pos)) {
                    lastnameOffset += pos + datum.data.data.lastNames[i].length;
                }
            } while ((pos !== -1) && firstnameMap.has(pos));

            if (pos !== -1) {
                lastnameOffset = pos;

                if (pos < minPosLastnames) {
                    minPosLastnames = pos;
                }

                lastnameMap.set(
                    pos,
                    {
                        label: datum.data.data.lastNames[i],
                        isPreferred: false,
                        isLastName: true,
                        isNameRtl: datum.data.data.isNameRtl
                    }
                );
            }
        }

        names[minPosLastnames] = [...lastnameMap].map(([, value]) => (value));

        // Extract the values (keys don't matter anymore)
        return Object.values(names);
    }

    /**
     * Creates a single <tspan> element for each single name and append it to the
     * parent element. The "tspan" element containing the preferred name gets an
     * additional underline style to highlight this one.
     *
     * @param {selection}                       parent The parent element to which the <tspan> elements are to be attached
     * @param {function(*): LabelElementData[]} data
     *
     * @private
     */
    addLabelElements(parent, data) {
        parent.selectAll("tspan")
            .data(data)
            .enter()
            .call((g) => {
                g.append("tspan")
                    .text(datum => datum.label)
                    // Add some spacing between the elements
                    .attr("dx", (datum, index) => {
                        return index !== 0 ? ((datum.isNameRtl ? -1 : 1) * 0.25) + "em" : null;
                    })
                    // Highlight the preferred and last name
                    .classed("preferred", datum => datum.isPreferred)
                    .classed("lastName", datum => datum.isLastName)
                    .classed("date", datum => datum.isDate)
                    .classed("place", datum => datum.isPlace);
            });
    }

    /**
     * Measures the given text and return its width depending on the used font (including size and weight).
     *
     * @param {String} text
     * @param {String} fontSize
     * @param {Number} fontWeight
     *
     * @returns {Number}
     *
     * @private
     */
    measureText(text, fontSize, fontWeight = 400) {
        const fontFamily = this._svg.style("font-family");

        return measureText(text, fontFamily, fontSize, fontWeight);
    }

    /**
     * Returns a float representing the computed length of all <tspan> elements within the element.
     *
     * @param {selection} parent The parent (<text> or <textPath>) element containing the <tspan> child elements
     *
     * @returns {Number}
     */
    getTextLength(parent) {
        const fontSize = parent.style("font-size");
        const fontWeight = parent.style("font-weight");
        let text = parent.text();
        let totalTextLength = this.measureText(text, fontSize, fontWeight);

        let n = parent.selectAll("tspan").size();
        totalTextLength += (n - 1) * 0.25 * parseInt(fontSize);

        return totalTextLength;
    }

    /**
     * Returns TRUE if the ratio of width to heigth of the element is > 1. So labels should
     * be rendered along an arc path (in transverse direction). Otherwise returns FALSE to
     * indicate the element label shall be either radial or that the element is the center one.
     *
     * @param {Object} data The D3 data object
     *
     * @return {Boolean}
     */
    isLabelAlongArc(data) {
        // Note: The center element does not belong to the transverse labels!
        // hr: oirignal code: return ((data.depth > 0) && (data.depth <= this._configuration.numberOfInnerCircles));
        return ((data.depth > 0) && (this._geometry.arcLength(data, 50) > this._configuration.outerArcHeight));
    }

    /**
     * Creates a new <path> definition and append it to the global definition list.
     *
     * @param {String} parentId The parent element id
     * @param {Number} index    Index position of an element in parent container. Required to create a unique path id.
     * @param {Object} data     The D3 data object
     *
     * @return {String} The id of the newly created path element
     */
    createPathDefinition(parentId, index, data, numberOfLines) {
        let pathId = "path-" + parentId + "-" + index;

        // If definition already exists, return the existing path ID
        if (this._svg.defs.get().select("path#" + pathId).node()) {
            return pathId;
        }

        let positionFlipped = this.isPositionFlipped(data.depth, data.x0, data.x1);
        let startAngle = this._geometry.startAngle(data.depth, data.x0);
        let endAngle = this._geometry.endAngle(data.depth, data.x1);
        let relativeRadius = this._geometry.relativeRadius(data.depth, this.getTextOffset(positionFlipped, index, numberOfLines));

        // Create an arc generator for path segments
        let arcGenerator = d3.arc()
            .startAngle(positionFlipped ? endAngle : startAngle)
            .endAngle(positionFlipped ? startAngle : endAngle)
            .innerRadius(relativeRadius)
            .outerRadius(relativeRadius);

        arcGenerator
            .padAngle(this._configuration.padAngle)
            .padRadius(this._configuration.padRadius)
            .cornerRadius(this._configuration.cornerRadius);

        // Store the <path> inside the definition list, so we could
        // access it later on by its id
        this._svg.defs.get()
            .append("path")
            .attr("id", pathId)
            .attr("d", arcGenerator);

        return pathId;
    }

    /**
     * Check for the 360-degree chart if the current arc labels should be flipped for easier reading.
     *
     * @param {Number} depth The depth of the element inside the chart
     * @param {Number} x0    The left edge (x0) of the rectangle
     * @param {Number} x1    The right edge (x1) of the rectangle
     *
     * @return {Boolean}
     */
    isPositionFlipped(depth, x0, x1) {
        if ((this._configuration.fanDegree !== 360) || (depth == 0)) {
            return false;
        }

        const startAngle = this._geometry.startAngle(depth, x0);
        const endAngle = this._geometry.endAngle(depth, x1);
        const midAngle = (startAngle + endAngle) / 2;

        // Flip names for better readability depending on position in chart
        return ((midAngle >= (90 * MATH_DEG2RAD)) && (midAngle <= (180 * MATH_DEG2RAD)))
            || ((midAngle >= (-180 * MATH_DEG2RAD)) && (midAngle <= (-90 * MATH_DEG2RAD)));
    }

    /**
     * Get the relative position offsets in percent for different text lines (firstName, lastName, dates, place).
     *   => (0 = inner radius, 100 = outer radius)
     *
     * @param {Boolean} positionFlipped TRUE if the labels should be flipped for easier reading
     * @param {Number}  index           The index position of element in parent container. Required to create a unique path id.
     * @param {Number}  numberOfLines   Overall number of lines of the label
     *
     * @return {Number}
     */
    getTextOffset(positionFlipped, index, numberOfLines) {

        return positionFlipped
            ? 100 / (numberOfLines + 1) * (index + 1) + 5
            : 100 - (100 / (numberOfLines + 1) * (index + 1)) - 5;
    }

    /**
     * Calculate the available text width (or radius for the inner circle). Depending on the label type (radial or along the arc)
     * and the individual width of radial labels, the available width differs.
     *
     * @param {Object} data          The D3 data object
     * @param {Number} index         The index position of element in parent container.
     * @param {Number} numberOfLines Overall number of lines of the label
     *
     * @returns {Number} Calculated available width or radius
     *
     * @private
     */
    getAvailableWidth(data, index, numberOfLines) {
        let availableWidth = 0;

        if (data.depth === 0) {
            // Inner circle. The available radius is calculated.
            availableWidth = this._configuration.centerCircleRadius - this._configuration.colorArcWidth;
        }

        else if (!this.isLabelAlongArc(data)) {
            // Radial labels
            availableWidth = this._configuration.outerArcHeight - this._configuration.colorArcWidth;
        }

        else if (this.isLabelAlongArc(data)) {
            //Labels along the arc
            let positionFlipped = this.isPositionFlipped(data.depth, data.x0, data.x1);
            availableWidth = this._geometry.arcLength(data, this.getTextOffset(positionFlipped, index, numberOfLines));
        }

        return availableWidth;
    }

    /**
     * Calculate the index of the font sizing line

     * @param {selection} parent        The D3 parent group object
     * @param {Object}    data          The The D3 data object
     * @param {Number}    numberOfLines Overall number of lines of the label
     *
     * @returns {Number}
     */
    getIndexOfSizingLine(parent, data, numberOfLines, labelFontSize) {
        let indexOfSizingLine = 0;
        let textLength = 0;

        if (data.depth === 0) {
            // Inner circle
            let mapIndexToOffset = this.mapIndexToOffset(parent, data, labelFontSize);
            let textOffset = 0;
            let arrayOfSquareText = [];

            let that = this;
            parent.selectAll("text")
                .each(function (d, i) {
                    textLength = that.getTextLength(d3.select(this));
                    textOffset = (Math.abs(mapIndexToOffset(i)) + 0.5) * labelFontSize;
                    arrayOfSquareText[i] = textOffset ** 2 + (textLength / 2) ** 2;
                });

            indexOfSizingLine = arrayOfSquareText.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);
        }

        else {
            // Radial labels and labels along the arc
            let availableWidth = 0;
            let ratio = [];

            let that = this;
            parent.selectAll("text")
                .each(function (d, i) {
                    textLength = that.getTextLength(d3.select(this));
                    availableWidth = that.getAvailableWidth(data, i, numberOfLines);
                    ratio[i] = textLength / availableWidth;
                });

            indexOfSizingLine = ratio.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);
        }

        return indexOfSizingLine;
    }

    /**
     * Transform the D3 <text> elements in the group. Rotate each <text> element depending on its offset,
     * so that they are equally positioned inside the arc.
     *
     * @param {selection} parent        The D3 parent group object
     * @param {Object}    datum         The The D3 data object
     * @param {Number}    labelFontSize The font size of the label
     *
     * @public
     */
    transformText(parent, data, labelFontSize) {
        let that = this;
        let textElements = parent.selectAll("text");
        let mapIndexToOffset = this.mapIndexToOffset(parent, data, labelFontSize);

        textElements.each(function (ignore, i) {
            const offsetRotate = mapIndexToOffset(i);

            // Correct the vertical text position depending on font size 
            d3.select(this).attr("dy", (labelFontSize / 3) + "px");

            // Name of center person should not be rotated in any way
            if (data.depth === 0) {
                d3.select(this).attr("transform", "translate(0 " + (labelFontSize * offsetRotate) + ")");
            }

            // Radial labels
            else {
                d3.select(this).attr("transform", function () {
                    let dx = data.x1 - data.x0;
                    let angle = that._geometry.scale(data.x0 + (dx / 2)) * MATH_RAD2DEG;
                    let rotate = angle - (offsetRotate * (angle > 0 ? -1 : 1));
                    let translate = (that._geometry.centerRadius(data.depth) - (that._configuration.colorArcWidth / 2.0));

                    if (angle > 0) {
                        rotate -= 90;
                    } else {
                        translate = -translate;
                        rotate += 90;
                    }

                    return "rotate(" + rotate + ") translate(" + translate + ")";
                });
            }
        });
    }

    // Calculates the text offsets
    mapIndexToOffset(parent, data, labelFontSize) {
        let that = this;
        let textElements = parent.selectAll("text");
        let countElements = textElements.size();
        let offsetRadius = (data.depth - 0.5) * that._configuration.outerArcHeight + that._configuration.centerCircleRadius;
        let offset = labelFontSize * 1.6 / offsetRadius * MATH_RAD2DEG;

        // Special offset for inner circle
        if (data.depth === 0) {
            offset = 1.7;
        }

        // Array of offsets for all text lines
        let mapIndexToOffset = d3.scaleLinear()
            .domain([0, countElements - 1])
            .range([(-offset * (countElements - 1) / 2), (offset * (countElements - 1) / 2)]);

        return mapIndexToOffset;
    }

    // Sets the optimal font size
    setFontSize(parent, data, numberOfLines) {
        let labelFontSize = 10;
        parent.style("font-size", labelFontSize + "px");

        // Special case inner circle
        if (data.depth == 0) {

            let indexOfSizingLine = this.getIndexOfSizingLine(parent, data, numberOfLines, labelFontSize);
            let mapIndexToOffset = this.mapIndexToOffset(parent, data, labelFontSize);
            let maxTextOffset = (Math.abs(mapIndexToOffset(indexOfSizingLine)) + 0.5) * labelFontSize;
            let sizingLabelLineWidth = this.getTextLength(parent.selectAll("text").filter((d, i) => i == indexOfSizingLine));

            let maxTextRadius = Math.sqrt(maxTextOffset ** 2 + (sizingLabelLineWidth / 2) ** 2);
            let availableRadius = this.getAvailableWidth(data, indexOfSizingLine, numberOfLines);

            let radiusRatio = (maxTextRadius + 0.8 * labelFontSize) / availableRadius;
            labelFontSize = labelFontSize / radiusRatio;
            parent.style("font-size", labelFontSize + "px");

            return (labelFontSize);
        }

        let availableHeight = this.isLabelAlongArc(data)
            ? this._configuration.outerArcHeight  // Labels along arc
            : this._geometry.arcLength(data, 50); // Radial labels

        let maxTextHeight = this.getMaxLabelHight(parent, labelFontSize, numberOfLines);

        let indexOfSizingLine = this.getIndexOfSizingLine(parent, data, numberOfLines, labelFontSize);
        let availableWidth = this.getAvailableWidth(data, indexOfSizingLine, numberOfLines);
        let sizingLabelLineWidth = this.getTextLength(parent.selectAll("text").filter((d, i) => i == indexOfSizingLine));

        let widthRatio = (sizingLabelLineWidth + 2 * labelFontSize) / availableWidth;
        let heightRatio = maxTextHeight / availableHeight;
        let max = Math.max(widthRatio, heightRatio);

        labelFontSize = labelFontSize / max;
        parent.style("font-size", labelFontSize + "px");

        return (labelFontSize);
    }

    // Calculates maximum overall text higth of all text lines of a label
    getMaxLabelHight(parent, labelFontSize, numberOfLines) {

        return numberOfLines * 1.7 * labelFontSize;
    }
}
