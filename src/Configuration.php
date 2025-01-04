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

namespace HerrRossi\Webtrees\DescendantFanChart;

use Fig\Http\Message\RequestMethodInterface;
use Fisharebest\Webtrees\I18N;
use Fisharebest\Webtrees\Module\AbstractModule;
use Fisharebest\Webtrees\Validator;
use Psr\Http\Message\ServerRequestInterface;

/**
 * Configuration class.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-fan-chart/
 */
class Configuration
{
    /**
     * The default number of generations to display.
     *
     * @var int
     */
    private const DEFAULT_GENERATIONS = 6;

    /**
     * Minimum number of displayable generations.
     *
     * @var int
     */
    private const MIN_GENERATIONS = 2;

    /**
     * Maximum number of displayable generations.
     *
     * @var int
     */
    private const MAX_GENERATIONS = 30;

    /**
     * The default number of inner levels.
     *
     * @var int
     */
    private const DEFAULT_INNER_ARCS = 3;

    /**
     * Minimum number of displayable inner levels.
     *
     * @var int
     */
    private const MIN_INNER_ARCS = 0;

    /**
     * Maximum number of displayable inner levels.
     *
     * @var int
     */
    private const MAX_INNER_ARCS = 5;

    /**
     * The default fan chart degree.
     *
     * @var int
     */
    private const FAN_DEGREE_DEFAULT = 360;

    /**
     * The default font size scaling factor in percent.
     *
     * @var int
     */
    private const FONT_SCALE_DEFAULT = 100;

    /**
     * The calling module.
     */
    private AbstractModule $module;

    /**
     * The possible selectable options for showing descendants.
     *
     * @return array
     */
    private array $descendantsOptions = [];

    /**
     * The default option for showing descendants.
     *
     * @return string
     */
    private string $defaultDescendantsOption = '';

    /**
     * The current request instance.
     *
     * @var ServerRequestInterface
     */
    private ServerRequestInterface $request;

    /**
     * Configuration constructor.
     *
     * @param ServerRequestInterface $request
     */
    public function __construct(ServerRequestInterface $request, AbstractModule $module)
    {
        $this->request = $request;
        $this->module  = $module;

        // The possible selectable options for showing descendants.
        $this->descendantsOptions = [
            'all'                     => I18N::translate('All'),
            'onlyMaleDescendants'     => I18N::translate('Only male descendant lines'),
            'onlyFemaleDescendants'   => I18N::translate('Only female descendant lines'),
            'onlyMaleDescendantsPlus' => I18N::translate('Only male descendant lines or same family name'),
        ];

        // The default option for showing descendants.
        $this->defaultDescendantsOption = 'all';
    }

    /**
     * Returns the number of generations to display.
     *
     * @return int
     */
    public function getGenerations(): int
    {
        if ($this->request->getMethod() === RequestMethodInterface::METHOD_POST) {
            $validator = Validator::parsedBody($this->request);
        } else {
            $validator = Validator::queryParams($this->request);
        }

        return $validator
            ->isBetween(self::MIN_GENERATIONS, self::MAX_GENERATIONS)
            ->integer(
                'generations',
                (int) $this->module->getPreference(
                    'default_generations',
                    (string) self::DEFAULT_GENERATIONS
                )
            );
    }

    /**
     * Returns a list of possible selectable generations.
     *
     * @return string[]
     */
    public function getGenerationsList(): array
    {
        $result = [];

        foreach (range(self::MIN_GENERATIONS, self::MAX_GENERATIONS) as $value) {
            $result[$value] = I18N::number($value);
        }

        return $result;
    }

    /**
     * Returns the font scale to use.
     *
     * @return int
     */
    public function getFontScale(): int
    {
        return Validator::queryParams($this->request)
            ->isBetween(10, 200)
            ->integer('fontScale', self::FONT_SCALE_DEFAULT);
    }

    /**
     * Returns the fan degree to use.
     *
     * @return int
     */
    public function getFanDegree(): int
    {
        return Validator::queryParams($this->request)
            ->isBetween(180, 360)
            ->integer('fanDegree', self::FAN_DEGREE_DEFAULT);
    }

    /**
     * Returns the selected option for highlighting young deceased persons.
     *
     * @return bool
     */
    public function getHighlightDeceasedYoung(): bool
    {
        return Validator::queryParams($this->request)
            ->boolean('highlightDeceasedYoung', false);
    }

    /**
     * Returns the possible selectable options for showing descendants.
     *
     * @return array
     */
    public function getDescendantsOptions(): array
    {
        return $this->descendantsOptions;
    }

    /**
     * Returns the selected option for showing descendants.
     *
     * @return string
     */
    public function getDescendantsOptionSelected(): string
    {
        return Validator::queryParams($this->request)
            ->isInArrayKeys($this->descendantsOptions)
            ->string('descendantsOptions', $this->defaultDescendantsOption);
    }

    /**
     * Returns whether to show color gradients or not.
     *
     * @return bool
     */
    public function getShowColorGradients(): bool
    {
        return Validator::queryParams($this->request)
            ->boolean('showColorGradients', false);
    }

    /**
     * Returns whether to show parent marriage dates or not.
     *
     * @return bool
     */
    public function getShowParentMarriageDates(): bool
    {
        return Validator::queryParams($this->request)
            ->boolean('showParentMarriageDates', false);
    }

    /**
     * Returns the number of inner arcs to display.
     *
     * @return int
     */
    public function getInnerArcs(): int
    {
        return Validator::queryParams($this->request)
            ->isBetween(self::MIN_INNER_ARCS, self::MAX_INNER_ARCS)
            ->integer('innerArcs', self::DEFAULT_INNER_ARCS);
    }

    /**
     * Returns a list of possible selectable values for inner arcs.
     *
     * @return string[]
     */
    public function getInnerArcsList(): array
    {
        $result = [];

        foreach (range(self::MIN_INNER_ARCS, self::MAX_INNER_ARCS) as $value) {
            $result[$value] = I18N::number($value);
        }

        return $result;
    }

    // added by hr
    /**
     * Returns the xref of the individual of direct line.
     * @param int $directLineNumber
     * 
     * @return string[]
     */
    public function getXrefDL($directLineNumber): string
    {      
        return Validator::queryParams($this->request)
            ->isXref()->string('xrefDL' . $directLineNumber, '');
    }

    /**
     * Returns whether to hide the SVG export button or not.
     *
     * @return bool
     */
    public function getHideSvgExport(): bool
    {
        if ($this->request->getMethod() === RequestMethodInterface::METHOD_POST) {
            $validator = Validator::parsedBody($this->request);
        } else {
            $validator = Validator::queryParams($this->request);
        }

        return $validator
            ->boolean(
                'hideSvgExport',
                (bool) $this->module->getPreference(
                    'default_hideSvgExport',
                    '0'
                )
            );
    }

    /**
     * Returns whether to hide the PNG export button or not.
     *
     * @return bool
     */
    public function getHidePngExport(): bool
    {
        if ($this->request->getMethod() === RequestMethodInterface::METHOD_POST) {
            $validator = Validator::parsedBody($this->request);
        } else {
            $validator = Validator::queryParams($this->request);
        }

        return $validator
            ->boolean(
                'hidePngExport',
                (bool) $this->module->getPreference(
                    'default_hidePngExport',
                    '0'
                )
            );
    }
}
