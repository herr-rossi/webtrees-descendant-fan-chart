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
 * The class handles all the text and path elements.
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
        // Define label elements
        const nameGroups = this.createNamesData(datum);

        const timeSpan = datum.data.data.timespan !== "" ? [[{
            label: datum.data.data.timespan,
            isPreferred: false,
            isLastName: false,
            isNameRtl: datum.data.data.isNameRtl,
            isDate: true
        }]] : [];

        const birthPlace = "birthplacedummy" !== "" ? [[{
            label: "birthplacedummy",
            //label: datum.data.data.birthPlace,
            isPreferred: false,
            isLastName: false,
            isNameRtl: datum.data.data.isNameRtl,
            isDate: true
            //isPlace: true
        }]] : [];

        let labelGroups = [];

        // Define label groups

        // Labels along arc (four lines)
        if (this.isLabelAlongArc(datum)) {
            labelGroups = [].concat(nameGroups, timeSpan, birthPlace);

            // Radial labels
        } else {

            // Very narrow labels (one line)
            if (this._geometry.arcLength(datum, 1) <= 30 && datum.depth > 0) {
                const [first, ...last] = nameGroups;

                // Merge the firstname and lastname groups, as we display the whole name in one line
                const labelGroup = [].concat(
                    first,
                    typeof last[0] !== "undefined" ? last[0] : [],
                    typeof timeSpan[0] !== "undefined" ? timeSpan[0] : [],
                    typeof birthPlace[0] !== "undefined" ? birthPlace[0] : []);
                labelGroups = [labelGroup];
            }

            // Narrow labels (two lines)
            else if (this._geometry.arcLength(datum, 1) <= 50 && datum.depth > 0) {
                const [first, ...last] = nameGroups;

                // Merge the firstname and lastname groups, as we display the whole name in one line
                const labelGroup1 = [].concat(first, typeof last[0] !== "undefined" ? last[0] : []);
                const labelGroup2 = [].concat(
                    typeof timeSpan[0] !== "undefined" ? timeSpan[0] : [],
                    typeof birthPlace[0] !== "undefined" ? birthPlace[0] : []);
                labelGroups = [].concat([labelGroup1], [labelGroup2]);
            }

            // Medium wide lables (three lines)
            else if (this._geometry.arcLength(datum, 1) <= 70 && datum.depth > 0) {
                const labelGroup2 = [].concat(
                    typeof timeSpan[0] !== "undefined" ? timeSpan[0] : [],
                    typeof birthPlace[0] !== "undefined" ? birthPlace[0] : []);
                labelGroups = [].concat(nameGroups, [labelGroup2]);
            }

            // Wide lables and inner circle (four lines)
            else if (this._geometry.arcLength(datum, 1) > 70 || datum.depth == 0) {
                labelGroups = [].concat(nameGroups, timeSpan, birthPlace);
            }
        }

        // Append labels

        // Labels along arc
        if (this.isLabelAlongArc(datum)) {
            const parentId = d3.select(parent.node().parentNode).attr("id");
            const numberOfLines = labelGroups.length;

            // The textPath element must be contained individually in a text element, otherwise the exported
            // chart will not be drawn correctly in Inkscape (actually this is not necessary, the browsers
            // display the chart correctly).

            labelGroups.forEach((labelGroup, index) => {
                const availableWidth = this.getAvailableWidth(datum, index, numberOfLines);
                const pathId = this.createPathDefinition(parentId, index, datum, numberOfLines);
                const textPath = parent
                    .append("text")
                    .append("textPath")
                    .attr("xlink:href", "#" + pathId)
                    .attr("startOffset", "25%");

                this.addLabelElements(
                    textPath,
                    this.truncateNamesData(
                        textPath,
                        labelGroup,
                        availableWidth
                    )
                );
            });

            // Set optimised font size
            this.setFontSize(parent, datum);

            // Radial labels
        } else {

            labelGroups.forEach((labelGroup, index) => {
                const availableWidth = this.getAvailableWidth(datum, index, 1);
                const text = parent
                    .append("text");
                this.addLabelElements(
                    text,
                    //      this.truncateNamesData(
                    //          text,
                    labelGroup //,
                    //      availableWidth
                    //      )
                );
            });

            // Set optimised font size
            let labelFontSize = this.setFontSize(parent, datum);

            // Set correct offset according to the font size
            parent.selectAll("text")
                .attr("dy", (labelFontSize / 3) + "px");

            // Rotate outer labels in the right position
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
     * Creates the data array for the alternative name.
     *
     * @param {NameElementData} datum
     *
     * @return {LabelElementData[]}
     *
     * @private
     */
    createAlternativeNamesData(datum) {
        let words = datum.data.data.alternativeName.split(/\s+/);

        /** @var {LabelElementData[]} names */
        let names = [];

        // Append the alternative names
        names = names.concat(
            words.map((word) => {
                return {
                    label: word,
                    isPreferred: false,
                    isLastName: false,
                    isNameRtl: datum.data.data.isAltRtl
                }
            })
        );

        return names;
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
     * Creates the data array for the names.
     *
     * @param {Object}             parent
     * @param {LabelElementData[]} names
     * @param {Number}             availableWidth
     *
     * @return {LabelElementData[]}
     *
     * @private
     */
    truncateNamesData(parent, names, availableWidth) {
        const fontSize = parent.style("font-size");
        const fontWeight = parent.style("font-weight");

        return this.truncateNames(names, fontSize, fontWeight, availableWidth);
    }

    /**
     * Creates a single <tspan> element for the marriage date and append it to the parent element.
     *
     * @param {selection} parent The parent (<text> or <textPath>) element to which the <tspan> elements are to be attached
     * @param {Object}    datum  The D3 data object containing the individual data
     */
    addMarriageDate(parent, datum) {
        // Create a <tspan> element for the parent marriage date
        if (datum.data.data.marriageDateOfParents) {
            parent.append("tspan")
                .text("\u26AD " + datum.data.data.marriageDateOfParents);
        }
    }

    /**
     * Truncates the list of names.
     *
     * @param {LabelElementData[]} names          The names array
     * @param {String}             fontSize       The font size
     * @param {Number}             fontWeight     The font weight
     * @param {Number}             availableWidth The available width
     *
     * @return {LabelElementData[]}
     *
     * @private
     */
    truncateNames(names, fontSize, fontWeight, availableWidth) {
        let text = names.map(item => item.label).join(" ");

        return names
            // Start truncating from the last element to the first one
            .reverse()
            .map((name) => {
                // Select all not preferred and not last names
                if ((name.isPreferred === false)
                    && (name.isLastName === false)
                ) {
                    if (this.measureText(text, fontSize, fontWeight) > availableWidth) {
                        // Keep only the first letter
                        name.label = name.label.slice(0, 1) + ".";
                        text = names.map(item => item.label).join(" ");
                    }
                }

                return name;
            })
            .map((name) => {
                // Afterward, the preferred ones, if text takes still too much space
                if (name.isPreferred === true) {
                    if (this.measureText(text, fontSize, fontWeight) > availableWidth) {
                        // Keep only the first letter
                        name.label = name.label.slice(0, 1) + ".";
                        text = names.map(item => item.label).join(" ");
                    }
                }

                return name;
            })
            .map((name) => {
                // Finally truncate lastnames
                if (name.isLastName === true) {
                    if (this.measureText(text, fontSize, fontWeight) > availableWidth) {
                        // Keep only the first letter
                        name.label = name.label.slice(0, 1) + ".";
                        text = names.map(item => item.label).join(" ");
                    }
                }

                return name;
            })
            // Revert reversed order again
            .reverse();
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
        const fontFamily = this._svg.get().style("font-family");

        return measureText(text, fontFamily, fontSize, fontWeight);
    }

    /**
     * Truncates a date value.
     *
     * @param {selection} parent         The parent (<text> or <textPath>) element containing the <tspan> child elements
     * @param {Number}    availableWidth The total available width the text could take
     */
    truncateDate(parent, availableWidth) {
        let that = this;

        return function () {
            let textLength = that.getTextLength(parent);
            let tspan = d3.select(this);
            let text = tspan.text();

            // Repeat removing the last char until the width matches
            while ((textLength > availableWidth) && (text.length > 1)) {
                // Remove last char
                text = text.slice(0, -1).trim();

                tspan.text(text);

                // Recalculate text length
                textLength = that.getTextLength(parent);
            }

            // Remove trailing dot if present
            if (text[text.length - 1] === ".") {
                tspan.text(text.slice(0, -1).trim());
            }
        };
    }

    /**
     * Returns a float representing the computed length of all <tspan> elements within the element.
     *
     * @param {selection} parent The parent (<text> or <textPath>) element containing the <tspan> child elements
     *
     * @returns {Number}
     */
    getTextLength(parent) {
        let totalWidth = 0;

        // Calculate the total used width of all <tspan> elements
        parent.selectAll("tspan").each(function () {
            totalWidth += this.getComputedTextLength();
        });

        return totalWidth;
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

        // Special treatment for center marriage date position
        if (this._configuration.showParentMarriageDates && (index === 4) && (data.depth < 1)) {
            startAngle = this._geometry.calcAngle(data.x0);
            endAngle = this._geometry.calcAngle(data.x1);
        }

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
     * Get the relative position offsets in percent for different text lines (firstName, lastName, dates).
     *   => (0 = inner radius, 100 = outer radius)
     *
     * @param {Boolean} positionFlipped TRUE if the labels should be flipped for easier reading
     * @param {Number}  index           The index position of element in parent container. Required to create a unique path id.
     *
     * @return {Number}
     */
    getTextOffset(positionFlipped, index, numberOfLines) {
        // First names, Last name, Alternative name, Date, Parent marriage date
        return positionFlipped
            ? 100 / (numberOfLines + 1) * (index + 1) + 5
            : 100 - (100 / (numberOfLines + 1) * (index + 1)) - 5;
    }

    /**
     * Calculate the available text width. Depending on the depth of an entry in
     * the chart the available width differs.
     *
     * @param {Object} data  The D3 data object
     * @param {Number} index The index position of element in parent container.
     *
     * @returns {Number} Calculated available width
     *
     * @private
     */
    getAvailableWidth(data, index, numberOfLines) {
        // Outer arcs
        if (data.depth > this._configuration.numberOfInnerCircles) {
            return this._configuration.outerArcHeight
                - (this._configuration.textPadding * 2)
                - this._configuration.circlePadding;
        }

        // Innermost circle (Reducing the width slightly, avoiding the text is sticking too close to the edge)
        let availableWidth = (this._configuration.centerCircleRadius * 2) - (this._configuration.centerCircleRadius * 0.15);

        if (data.depth >= 1) {
            let positionFlipped = this.isPositionFlipped(data.depth, data.x0, data.x1);

            // Calculate length of the arc
            availableWidth = this._geometry.arcLength(data, this.getTextOffset(positionFlipped, index, numberOfLines));
        }

        return availableWidth - (this._configuration.textPadding * 2) - (this._configuration.padDistance / 2);
    }

    /**
     * Transform the D3 <text> elements in the group. Rotate each <text> element depending on its offset,
     * so that they are equally positioned inside the arc.
     *
     * @param {selection} parent The D3 parent group object
     * @param {Object}    datum  The The D3 data object
     *
     * @public
     */
    transformText(parent, data, labelFontSize) {
        let that = this;
        let textElements = parent.selectAll("text");
        let mapIndexToOffset = this.mapIndexToOffset(parent, data, labelFontSize);

        textElements.each(function (ignore, i) {
            const offsetRotate = mapIndexToOffset(i);

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


    /** old code        
    transformOuterText(parent, datum, labelFontSize)
    {
        let that = this;
        let textElements = parent.selectAll("text");
        let countElements = textElements.size();
        let offset = 1.0;

        // Special offsets for shifting the text around depending on the depth
        switch (datum.depth) {
            case 0: offset = 1.5; break;
            case 1: offset = 6.5; break;
            case 2: offset = 3.5; break;
            case 3: offset = 2.2; break;
            case 4: offset = 1.9; break;
            case 5: offset = 1.5; break;
            case 6: offset = 0.5; break;
        }

        let mapIndexToOffset = d3.scaleLinear()
            .domain([0, countElements - 1])
            .range([-offset, offset]);

        textElements.each(function (ignore, i) {
            const offsetRotate = mapIndexToOffset(i) * that._configuration.fontScale / 100.0;

            // The name of center person should not be rotated in any way
            if (datum.depth === 0) {
                // TODO Depends on font-size
                d3.select(this).attr("dy", (offsetRotate * 15) + (15 / 2) + "px");
            } else {
                d3.select(this).attr("transform", function () {
                    let dx        = datum.x1 - datum.x0;
                    let angle     = that._geometry.scale(datum.x0 + (dx / 2)) * MATH_RAD2DEG;
                    let rotate    = angle - (offsetRotate * (angle > 0 ? -1 : 1));
                    let translate = (that._geometry.centerRadius(datum.depth) - (that._configuration.colorArcWidth / 2.0));

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
*/

    // Calculates the text offsets
    mapIndexToOffset(parent, data, labelFontSize) {
        let that = this;
        let textElements = parent.selectAll("text");
        let countElements = textElements.size();
        let offsetRadius = (data.depth - 0.5) * that._configuration.innerArcHeight + that._configuration.centerCircleRadius;
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
    setFontSize(parent, data) {
        let labelFontSize = this.getMinFontSize();
        let availableWidth = 0; //this.getAvailableWidth(data, 2);
        let availableHeight = 0;

        // Special case inner circle
        if (data.depth == 0) {

            while (this.isTextWithinCircle(parent, data, labelFontSize) == true) {
                labelFontSize += 1;
                parent.style("font-size", labelFontSize + "px");
            }

            while (this.isTextWithinCircle(parent, data, labelFontSize) == false) {
                labelFontSize -= 1;
                parent.style("font-size", labelFontSize + "px");
            }

            return (labelFontSize);
        }

        // Radial labels
        if (!this.isLabelAlongArc(data)) {
            availableWidth = this._configuration.outerArcHeight - this._configuration.textPadding * 2;
            availableHeight = this._geometry.arcLength(data, 50);
        }

        // Labels along arc
        else {
            availableWidth = this._geometry.arcLength(data, 20) - this._configuration.textPadding * 2;
            availableHeight = this._configuration.outerArcHeight;
        }

        parent.style("font-size", labelFontSize + "px");

        let maxLabelLength = this.getMaxLabelLength(parent, data);
        let maxTextHeight = this.getMaxLabelHight(parent, labelFontSize);

        // Increase font size until max size reached
        while (maxLabelLength < availableWidth && maxTextHeight < availableHeight) {
            labelFontSize += 1;
            parent.style("font-size", labelFontSize + "px");
            maxLabelLength = this.getMaxLabelLength(parent, data);
            maxTextHeight = this.getMaxLabelHight(parent, labelFontSize);
        }

        while (maxLabelLength >= availableWidth || maxTextHeight >= availableHeight) {
            labelFontSize -= 1;
            parent.style("font-size", labelFontSize + "px");
            maxLabelLength = this.getMaxLabelLength(parent, data);
            maxTextHeight = this.getMaxLabelHight(parent, labelFontSize);
        }

        return (labelFontSize);
    }

    // Gets minimum font size
    getMinFontSize() {
        return (5 * this._configuration.fontScale / 100.0);
        //return (this._configuration.minFontSize * this._configuration.fontScale / 100.0);
    }

    // Checks if text fits in inner circle or not
    isTextWithinCircle(parent, data, labelFontSize) {
        let that = this;
        let textElements = parent.selectAll("text");

        let mapIndexToOffset = this.mapIndexToOffset(parent, data, labelFontSize);
        let isTextWithinCircle = true;
        let textOffset = 0;
        let textLength = 0;
        let squareText = 0;
        let squareRadius = 0;

        textElements.each(function (ignore, i) {
            textOffset = (Math.abs(mapIndexToOffset(i)) + 0.5) * labelFontSize;
            textLength = that.getTextLength(d3.select(this));
            squareText = textOffset ** 2 + (textLength / 2) ** 2;
            squareRadius = (that._configuration.centerCircleRadius - that._configuration.textPadding) ** 2;
            if (squareText > squareRadius) {
                isTextWithinCircle = false;
            }
        });

        return isTextWithinCircle;
    }

    // Calculates maximum text length of all text lines of a label
    getMaxLabelLength(parent, data) {
        let that = this;
        let maxLabelLength = 0;
        parent.selectAll("text")
            .each(function () {
                maxLabelLength = Math.max(maxLabelLength, that.getTextLength(d3.select(this)));
            });

        return maxLabelLength;
    }

    // Calculates maximum overall text higth of all text lines of a label
    getMaxLabelHight(parent, labelFontSize) {
        let maxLabelHight = 0;
        let numberOfTextStrings = parent.selectAll("text").size();
        maxLabelHight = numberOfTextStrings * 1.7 * labelFontSize;

        return maxLabelHight;
    }
}
