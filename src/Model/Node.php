<?php

/**
 * This file is part of the package magicsunday/webtrees-fan-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file that was distributed with this source code.
 *
 * This file was updated by herr--rossi (hr).
 */

declare(strict_types=1);

namespace HerrRossi\Webtrees\DescendantFanChart\Model;

use JsonSerializable;

/**
 * This class holds information about a node.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-fan-chart/
 */
class Node implements JsonSerializable
{
    /**
     * @var NodeData
     */
    protected NodeData $data;

    /**
     * The list of children.
     *
     * @var Node[]
     */
    protected array $children = [];

    /**
     * Constructor.
     *
     * @param NodeData $data
     */
    public function __construct(NodeData $data)
    {
        $this->data = $data;
    }

    /**
     * @return NodeData
     */
    public function getData(): NodeData
    {
        return $this->data;
    }

    /**
     * @param Node $children
     *
     * @return Node
     */
    public function addChildren(Node $children): Node
    {
        $this->children[] = $children;

        return $this;
    }

    /**
     * Returns the relevant data as an array.
     *
     * @return array<string, int|int[]|NodeData|Node[]>
     */
    public function jsonSerialize(): array
    {
        $jsonData = [
            'data' => $this->data,
        ];

        if ($this->children !== []) {
            $jsonData['children'] = $this->children;
        }

        return $jsonData;
    }
}
