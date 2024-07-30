/**
 * This file is part of the package magicsunday/webtrees-fan-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file that was distributed with this source code.
 *
 * This file was updated by herr--rossi (hr).
 */

import * as d3 from "../lib/d3";

export const SEX_MALE   = "M";
export const SEX_FEMALE = "F";

/**
 * This class handles the hierarchical data.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-fan-chart/
 */
export default class Hierarchy
{
    /**
     * Constructor.
     *
     * @param {Configuration} configuration The application configuration
     */
    constructor(configuration)
    {
        this._configuration = configuration;
        this._nodes         = null;
        this._root          = null;
    }

    /**
     * Initialize the hierarchical chart data.
     *
     * @param {Object} datum The JSON encoded chart data
     */
    
    // HerrRossi: new code for descendant chart
    
    init(datum)
    {
        // Get the greatest depth
        // const getDepth       = ({children}) => 1 + (children ? Math.max(...children.map(getDepth)) : 0);
        // const maxGenerations = getDepth(datum);

        // Construct root node from the hierarchical data
        let that = this;
        this._root = d3.hierarchy(
            datum,
            datum => {
                return datum.children
            })
            // Calculate number of leaves
            .sum(function(d) { return d.children ? 0 : (1 / (d.data.generation - 2 + 1 - 0))})
        
        // Create partition layout
        let partitionLayout = d3.partition();

        // Map the node data to the partition layout
        this._nodes = partitionLayout(this._root)
            .descendants();

        // Assign a unique ID to each node
        this._nodes.forEach((d, i) => {
            d.id = i;
        });
    }

    /**
     * Returns the nodes.
     *
     * @return {Array}
     */
    get nodes()
    {
        return this._nodes;
    }

    /**
     * Returns the root note.
     *
     * @returns {Individual}
     *
     * @public
     */
    get root()
    {
        return this._root;
    }

    /**
     * Create an empty child node object.
     *
     * @param {Number} generation Generation of the node
     * @param {String} sex        The sex of the individual
     *
     * @return {Object}
     *
     * @private
     */
    createEmptyNode(generation, sex)
    {
        return {
            data: {
                id              : 0,
                xref            : "",
                url             : "",
                updateUrl       : "",
                generation      : generation,
                name            : "",
                firstNames      : [],
                lastNames       : [],
                preferredName   : "",
                alternativeName : "",
                isAltRtl        : false,
                sex             : sex,
                timespan        : ""
            }
        };
    }
}
