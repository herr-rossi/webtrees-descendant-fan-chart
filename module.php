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

namespace HerrRossi\Webtrees;

use Composer\Autoload\ClassLoader;
use Fisharebest\Webtrees\Registry;
use HerrRossi\Webtrees\DescendantFanChart\Module;

// Register our namespace
$loader = new ClassLoader();
$loader->addPsr4('HerrRossi\\Webtrees\\DescendantFanChart\\', __DIR__ . '/src');
$loader->register();

// Create and return instance of the module
return Registry::container()->get(Module::class);
