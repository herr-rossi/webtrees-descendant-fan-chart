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

namespace HerrRossi\Webtrees\DescendantFanChart\Processor;

use Fisharebest\Webtrees\Date;
use Fisharebest\Webtrees\Family;
use Fisharebest\Webtrees\I18N;
use Fisharebest\Webtrees\Individual;
use Fisharebest\Webtrees\Place; // added by hr
use Fisharebest\Webtrees\Age; // added by hr

/**
 * Class DateProcessor.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-module-base/
 */
class DateProcessor
{
    /**
     * The individual.
     *
     * @var Individual
     */
    private Individual $individual;

    /**
     * The birthdate of the individual.
     *
     * @var Date
     */
    private Date $birthDate;

    /**
     * The death date of the individual.
     *
     * @var Date
     */
    private Date $deathDate;

    // added by hr
    /**
     * The birth place of the individual.
     *
     * @var Place
     */
    private Place $birthPlace;

    /**
     * Constructor.
     *
     * @param Individual $individual The individual to process
     */
    public function __construct(Individual $individual)
    {
        $this->individual = $individual;
        $this->birthDate  = $this->individual->getBirthDate();
        $this->deathDate  = $this->individual->getDeathDate();
        $this->birthPlace = $this->individual->getBirthPlace(); // added by hr
    }

    /**
     * Removes HTML tags and converts/decodes HTML entities to their corresponding characters.
     *
     * @param string $value The value to decode
     *
     * @return string
     */
    private function decodeValue(string $value): string
    {
        return html_entity_decode(strip_tags($value), ENT_QUOTES, 'UTF-8');
    }

    /**
     * Get the year of birth.
     *
     * @return int
     */
    public function getBirthYear(): int
    {
        return $this->birthDate->minimumDate()->year();
    }

    /**
     * Get the year of death.
     *
     * @return int
     */
    public function getDeathYear(): int
    {
        return $this->deathDate->minimumDate()->year();
    }

    /**
     * Returns the formatted birthdate without HTML tags.
     *
     * @return string
     */
    public function getBirthDate(): string
    {
        return $this->decodeValue(
            $this->birthDate->display()
        );
    }

    /**
     * Returns the formatted death date without HTML tags.
     *
     * @return string
     */
    public function getDeathDate(): string
    {
        return $this->decodeValue(
            $this->deathDate->display()
        );
    }

    /**
     * Create the timespan label.
     *
     * @return string
     */
    public function getLifetimeDescription(): string
    {
        if ($this->birthDate->isOK() && $this->deathDate->isOK()) {
            return $this->getBirthYear() . '-' . $this->getDeathYear();
        }

        if ($this->birthDate->isOK()) {
            return I18N::translate('*%s', (string) $this->getBirthYear());
        }

        if ($this->deathDate->isOK()) {
            return I18N::translate('†%s', (string) $this->getDeathYear());
        }

        if ($this->individual->isDead()) {
            return I18N::translate('†');
        }

        return '';
    }

    // added by hr
    /**
     * Returns the formatted birthplace without HTML tags.
     *
     * @return string
     */
    public function getBirthPlace(): string
    {
        return $this->decodeValue(
            $this->birthPlace->placeName()
        );
    }

    // added by hr
    /**
     * Returns the birthplace description with or without *.
     *
     * @return string
     */
    public function getBirthPlaceDescription(): string
    {
        if ($this->birthDate->isOK() && !$this->deathDate->isOK() && $this->getBirthPlace() !== null) {
            return $this->getBirthPlace(); 
        }

        return '*' . $this->getBirthPlace();
    }

    /**
     * Returns the marriage date of the individual.
     *
     * @return string
     */
    public function getMarriageDate(): string
    {
        /** @var Family|null $family */
        $family = $this->individual->spouseFamilies()->first();

        if ($family !== null) {
            return $this->decodeValue(
                $family->getMarriageDate()->display()
            );
        }

        return '';
    }

    /**
     * Returns the marriage date of the parents.
     *
     * @return string
     */
    public function getMarriageDateOfParents(): string
    {
        /** @var Family|null $family */
        $family = $this->individual->childFamilies()->first();

        if ($family !== null) {
            return $this->decodeValue(
                $family->getMarriageDate()->display()
            );
        }

        return '';
    }

    // added by hr
    /**
     * Returns the person's age.
     *
     * @return int
     */
    public function getAge(): int
    {
        $this->age = new Age($this->birthDate, $this->deathDate);

        return $this->age->ageYears();
    }

    // added by hr
    /**
     * Returns true if person is deceased young.
     *
     * @return bool
     */
    public function getIsDeceasedYoung(): bool
    {
        if ($this->getAge() > -1 && $this->getAge() <= 18) {
        return true;
        }

        return false;
    }
}
