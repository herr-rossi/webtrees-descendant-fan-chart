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
use Fisharebest\Webtrees\Auth;
use Fisharebest\Webtrees\Http\Exceptions\HttpAccessDeniedException;
use Fisharebest\Webtrees\Http\Exceptions\HttpBadRequestException;
use Fisharebest\Webtrees\Http\Exceptions\HttpNotFoundException;
use Fisharebest\Webtrees\I18N;
use Fisharebest\Webtrees\Individual;
use Fisharebest\Webtrees\Module\AbstractModule;
use Fisharebest\Webtrees\Module\ModuleChartInterface;
use Fisharebest\Webtrees\Module\ModuleCustomInterface;
use Fisharebest\Webtrees\Module\ModuleThemeInterface;
use Fisharebest\Webtrees\Registry;
use Fisharebest\Webtrees\Validator;
use Fisharebest\Webtrees\View;
use JsonException;
use HerrRossi\Webtrees\DescendantFanChart\Facade\DataFacade;
use HerrRossi\Webtrees\DescendantFanChart\Traits\ModuleChartTrait;
use HerrRossi\Webtrees\DescendantFanChart\Traits\ModuleCustomTrait;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * Fan chart module class.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-fan-chart/
 */
class Module extends AbstractModule implements ModuleCustomInterface, ModuleChartInterface, RequestHandlerInterface
{
    use ModuleCustomTrait;
    use ModuleChartTrait;

    private const ROUTE_DEFAULT = 'webtrees-fan-chart';

    private const ROUTE_DEFAULT_URL = '/tree/{tree}/webtrees-fan-chart/{xref}';

    /**
     * @var string
     */
    private const GITHUB_REPO = 'magicsunday/webtrees-fan-chart';

    /**
     * @var string
     */
    public const CUSTOM_AUTHOR = 'Rico Sonntag';

    /**
     * @var string
     */
    public const CUSTOM_VERSION = '2.7.0';

    /**
     * @var string
     */
    public const CUSTOM_SUPPORT_URL = 'https://github.com/' . self::GITHUB_REPO . '/issues';

    /**
     * @var string
     */
    public const CUSTOM_LATEST_VERSION = 'https://api.github.com/repos/' . self::GITHUB_REPO . '/releases/latest';

    /**
     * The configuration instance.
     *
     * @var Configuration
     */
    private Configuration $configuration;

    /**
     * @var DataFacade
     */
    private DataFacade $dataFacade;

    /**
     * Constructor.
     *
     * @param DataFacade $dataFacade
     */
    public function __construct(
        DataFacade $dataFacade
    ) {
        $this->dataFacade = $dataFacade;
    }

    /**
     * Initialization.
     */
    public function boot(): void
    {
        Registry::routeFactory()
            ->routeMap()
            ->get(self::ROUTE_DEFAULT, self::ROUTE_DEFAULT_URL, $this)
            ->allows(RequestMethodInterface::METHOD_POST);

        View::registerNamespace($this->name(), $this->resourcesFolder() . 'views/');
    }

    /**
     * How should this module be identified in the control panel, etc.?
     *
     * @return string
     */
    public function title(): string
    {
        return I18N::translate('Descendant fan chart');
    }

    /**
     * A sentence describing what this module does.
     *
     * @return string
     */
    public function description(): string
    {
        return I18N::translate('A fan chart of an individual’s descendants.');
    }

    /**
     * Where does this module store its resources?
     *
     * @return string
     */
    public function resourcesFolder(): string
    {
        return __DIR__ . '/../resources/';
    }

    /**
     * Handles a request and produces a response.
     *
     * @param ServerRequestInterface $request
     *
     * @return ResponseInterface
     *
     * @throws JsonException
     */
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $tree = Validator::attributes($request)->tree();
        $xref = Validator::attributes($request)->isXref()->string('xref');
        $user = Validator::attributes($request)->user();

        // Convert POST requests into GET requests for pretty URLs.
        // This also updates the name above the form, which wont get updated if only a POST request is used
        if ($request->getMethod() === RequestMethodInterface::METHOD_POST) {
            $validator = Validator::parsedBody($request);

            return redirect(
                route(
                    self::ROUTE_DEFAULT,
                    [
                        'tree'                    => $tree->name(),
                        'xref'                    => $validator->string('xref', ''),
                        'generations'             => $validator->integer('generations', 6),
                        'fanDegree'               => $validator->integer('fanDegree', 210),
                        'fontScale'               => $validator->integer('fontScale', 100),
                        'hideEmptySegments'       => $validator->boolean('hideEmptySegments', false),
                        'showColorGradients'      => $validator->boolean('showColorGradients', false),
                        'showParentMarriageDates' => $validator->boolean('showParentMarriageDates', false),
                        'innerArcs'               => $validator->integer('innerArcs', 3),
                    ]
                )
            );
        }

        Auth::checkComponentAccess($this, ModuleChartInterface::class, $tree, $user);

        $individual = Registry::individualFactory()->make($xref, $tree);
        $individual = Auth::checkIndividualAccess($individual, false, true);

        $this->configuration = new Configuration($request);

        $ajaxUpdateUrl = route(
            'module',
            [
                'module' => $this->name(),
                'action' => 'update',
                'tree'   => $individual->tree()->name(),
                'xref'   => '',
            ]
        );

        return $this->viewResponse(
            $this->name() . '::chart',
            [
                'id'                => uniqid(),
                'title'             => $this->getPageTitle($individual),
                'ajaxUrl'           => $ajaxUpdateUrl,
                'moduleName'        => $this->name(),
                'individual'        => $individual,
                'tree'              => $tree,
                'configuration'     => $this->configuration,
                'chartParams'       => json_encode($this->getChartParameters($individual), JSON_THROW_ON_ERROR),
                'stylesheets'       => $this->getStylesheets(),
                'exportStylesheets' => $this->getExportStylesheets(),
                'javascript'        => $this->assetUrl('js/fan-chart.min.js'),
            ]
        );
    }

    /**
     * Returns the page title.
     *
     * @param Individual $individual The individual used in the current chart
     *
     * @return string
     */
    private function getPageTitle(Individual $individual): string
    {
        if ($individual->canShowName()) {
            return I18N::translate('Descendant fan chart of %s', $individual->fullName());
        }

        return I18N::translate('Descendant fan chart');
    }

    /**
     * Collects and returns the required chart data.
     *
     * @param Individual $individual The individual used in the current chart
     *
     * @return array<string, bool|array<string, string>>
     */
    private function getChartParameters(Individual $individual): array
    {
        return [
            'rtl'             => I18N::direction() === 'rtl',
            'showImages'      => $this->showImages($individual),
            'showSilhouettes' => $this->showSilhouettes($individual),
            'labels'          => [
                'zoom' => I18N::translate('Use Ctrl + scroll to zoom in the view'),
                'move' => I18N::translate('Move the view with two fingers'),
            ],
        ];
    }

    /**
     * Returns TRUE if the individual image should be shown, otherwise FALSE.
     *
     * @param Individual $individual The individual used in the current chart
     *
     * @return bool
     */
    private function showImages(Individual $individual): bool
    {
        return $individual->canShow()
            && ($individual->tree()->getPreference('SHOW_HIGHLIGHT_IMAGES') === '1');
    }

    /**
     * Returns TRUE if the silhouette images should be shown as alternative to the individual image, otherwise FALSE.
     *
     * @param Individual $individual The individual used in the current chart
     *
     * @return bool
     */
    private function showSilhouettes(Individual $individual): bool
    {
        return $this->showImages($individual)
            && ($individual->tree()->getPreference('USE_SILHOUETTE') === '1');
    }

    /**
     * Update action.
     *
     * @param ServerRequestInterface $request The current HTTP request
     *
     * @return ResponseInterface
     *
     * @throws JsonException
     * @throws HttpBadRequestException
     * @throws HttpAccessDeniedException
     * @throws HttpNotFoundException
     */
    public function getUpdateAction(ServerRequestInterface $request): ResponseInterface
    {
        $this->configuration = new Configuration($request);

        $tree = Validator::attributes($request)->tree();
        $user = Validator::attributes($request)->user();
        $xref = Validator::queryParams($request)->isXref()->string('xref');

        Auth::checkComponentAccess($this, ModuleChartInterface::class, $tree, $user);

        $individual = Registry::individualFactory()->make($xref, $tree);
        $individual = Auth::checkIndividualAccess($individual, false, true);

        $this->dataFacade
            ->setModule($this)
            ->setConfiguration($this->configuration)
            ->setRoute(self::ROUTE_DEFAULT);

        return response([
            'data' => $this->dataFacade->createTreeStructure($individual),
        ]);
    }

    /**
     * Returns a list of used stylesheets with this module.
     *
     * @return array<string>
     */
    private function getStylesheets(): array
    {
        return [$this->assetUrl('css/fan-chart.css'), $this->assetUrl('css/svg.css')];
    }

    /**
     * Returns a list required stylesheets for the SVG export.
     *
     * @return array<string>
     */
    private function getExportStylesheets(): array
    {
        /** @var ModuleThemeInterface $moduleTheme */
        $moduleTheme   = app(ModuleThemeInterface::class);
        $stylesheets   = $moduleTheme->stylesheets();
        $stylesheets[] = $this->assetUrl('css/svg.css');

        return $stylesheets;
    }
}
