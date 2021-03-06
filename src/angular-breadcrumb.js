'use strict';

function isAOlderThanB(scopeA, scopeB) {
    if (angular.equals(scopeA.length, scopeB.length)) {
        return scopeA > scopeB;
    }
    else {
        return scopeA.length > scopeB.length;
    }
}

function parseStateRef(ref) {
    var parsed = ref.replace(/\n/g, " ").match(/^([^(]+?)\s*(\((.*)\))?$/);
    if (!parsed || parsed.length !== 4) {
        throw new Error("Invalid state ref '" + ref + "'");
    }
    return {
        state: parsed[1],
        paramExpr: parsed[3] || null
    };
}

var $registeredListeners = {};

function registerListenerOnce(tag, $rootScope, event, fn) {
    var deregisterListenerFn = $registeredListeners[tag];
    if (deregisterListenerFn !== undefined) {
        deregisterListenerFn();
    }
    deregisterListenerFn = $rootScope.$on(event, fn);
    $registeredListeners[tag] = deregisterListenerFn;
}

function $Breadcrumb() {

    var $$options = {
        prefixStateName: null,
        template: 'bootstrap3',
        templateUrl: null,
        templateLast: 'default',
        templateLastUrl: null,
        includeAbstract: false
    };

    this.setOptions = function (options) {
        angular.extend($$options, options);
    };

    this.$get = ['$injector', function ($injector) {

        var $q = $injector.get('$q');
        var $state = $injector.get('$state');
        var $stateParams = $injector.get('$stateParams');
        var $rootScope = $injector.get('$rootScope');

        var $lastViewScope = $rootScope;

        // Early catch of $viewContentLoaded event
        registerListenerOnce('$Breadcrumb.$viewContentLoaded', $rootScope, '$viewContentLoaded', function (event) {
            // With nested views, the event occur several times, in "wrong" order
            if (!event.targetScope.ncyBreadcrumbIgnore &&
                isAOlderThanB(event.targetScope.$id, $lastViewScope.$id)) {
                $lastViewScope = event.targetScope;
            }
        });

        // Get the parent state
        var $$parentState = function (state) {
            // Check if state has explicit parent OR we try guess parent from its name
            var parent = state.parent || (/^(.+)\.[^.]+$/.exec(state.name) || [])[1];
            var isObjectParent = typeof parent === "object";
            // if parent is a object reference, then extract the name
            return isObjectParent ? parent.name : parent;
        };

        var $$isDynamicChain = function (state) {
            state = state ? $state.get(state) : $state.$current.self;
            //must be a funcion
            return state.ncyBreadcrumb && angular.isFunction(state.ncyBreadcrumb.dynamicStatesChain);
        };

        var $$isAngularCallback = function(ref){
          if (angular.isArray(ref)) {
            ref = ref[ref.length - 1];
          }
          return typeof(ref) === 'function' || ref.hasOwnProperty('$inject');
        }
        // Add the state in the chain if not already in and if not abstract
        var $$addStateInChain = function (chain, stateRef) {

            if($$isAngularCallback(stateRef)){
              stateRef = $injector.invoke(stateRef);
            }

            var conf,
                parentParams,
                ref = parseStateRef(stateRef.state || stateRef),
                force = false,
                skip = false,
                isDynamic = $$isDynamicChain(ref.state);

            for (var i = 0, l = chain.length; i < l && !isDynamic; i += 1) {
                if (chain[i].name === ref.state) {
                    return;
                }
            }

            conf = $state.get(ref.state);

            if (isDynamic) {
                //When dynamic, can have recursive states,
                //that make parent of itself in the ncyBreadcrumb.
                //In this case, Extend conf to copy the
                //properties and not override the value of label.
                conf = angular.extend({}, conf);
                conf.ncyBreadcrumbLabel = stateRef.label;
            }

            // Get breadcrumb options
            if (conf.ncyBreadcrumb) {
                if (conf.ncyBreadcrumb.force) {
                    force = true;
                }
                if (conf.ncyBreadcrumb.skip) {
                    skip = true;
                }
            }
            if ((!conf.abstract || $$options.includeAbstract || force) && !skip) {
                if (ref.paramExpr) {
                    parentParams = $lastViewScope.$eval(ref.paramExpr);
                }

                conf.ncyBreadcrumbLink = $state.href(ref.state, parentParams || $stateParams || {});
                conf.ncyBreadcrumbStateRef = stateRef.state || stateRef;

                chain.unshift(conf);
            }
        };

        // Get the state for the parent step in the breadcrumb
        var $$breadcrumbParentState = function (stateRef) {
            var ref = parseStateRef(stateRef),
                conf = $state.get(ref.state);

            if (conf.ncyBreadcrumb && conf.ncyBreadcrumb.parent) {
                // Handle the "parent" property of the breadcrumb, override the parent/child relation of the state
                var isFunction = typeof conf.ncyBreadcrumb.parent === 'function';
                var parentStateRef = isFunction ? conf.ncyBreadcrumb.parent($lastViewScope) : conf.ncyBreadcrumb.parent;
                if (parentStateRef) {
                    return parentStateRef;
                }
            }

            return $$parentState(conf);
        };

        return {

            getTemplate: function (templates) {
                if ($$options.templateUrl) {
                    // templateUrl takes precedence over template
                    return null;
                }
                else if (templates[$$options.template]) {
                    // Predefined templates (bootstrap, ...)
                    return templates[$$options.template];
                }
                else {
                    return $$options.template;
                }
            },

            getTemplateUrl: function () {
                return $$options.templateUrl;
            },

            getTemplateLast: function (templates) {
                if ($$options.templateLastUrl) {
                    // templateUrl takes precedence over template
                    return null;
                }
                else if (templates[$$options.templateLast]) {
                    // Predefined templates (default)
                    return templates[$$options.templateLast];
                }
                else {
                    return $$options.templateLast;
                }
            },

            getTemplateLastUrl: function () {
                return $$options.templateLastUrl;
            },

            getStatesChain: function (exitOnFirst) { // Deliberately undocumented param, see getLastStep
                var chain = [];

                // From current state to the root
                for (var stateRef = $state.$current.self.name; stateRef; stateRef = $$breadcrumbParentState(stateRef)) {
                    $$addStateInChain(chain, stateRef);
                    if (exitOnFirst && chain.length) {
                        return chain;
                    }
                }

                // Prefix state treatment
                if ($$options.prefixStateName) {
                    $$addStateInChain(chain, $$options.prefixStateName);
                }

                return chain;
            },

            getDynamicStatesChain: function () {
                var chain = [];

                // From current state get dynamic steps
                var stateRef = $state.$current.self;
                var dynamicStatesChainFn = stateRef.ncyBreadcrumb ? stateRef.ncyBreadcrumb.dynamicStatesChain : null;

                if (!angular.isFunction(dynamicStatesChainFn)) {
                    return this.getStatesChain();
                }

                return $q.when(dynamicStatesChainFn($injector)).then(function (steps) {
                    var step, i = 0;
                    var size = steps.length;

                    for (i; i < size; i++) {
                        step = steps[i];
                        $$addStateInChain(chain, step);
                    }

                    // Prefix state treatment
                    if ($$options.prefixStateName) {
                        $$addStateInChain(chain, $$options.prefixStateName);
                    }

                    return chain;
                });
            },

            getLastStep: function () {
                var chain = this.getStatesChain(true);
                return chain.length ? chain[0] : undefined;
            },

            $getLastViewScope: function () {
                return $lastViewScope;
            },
            isDynamicChain: $$isDynamicChain
        };
    }];
}

var getExpression = function (interpolationFunction) {
    if (interpolationFunction.expressions) {
        return interpolationFunction.expressions;
    }
    else {
        // Workaround for Angular 1.2.x
        var expressions = [];
        angular.forEach(interpolationFunction.parts, function (part) {
            if (angular.isFunction(part)) {
                expressions.push(part.exp);
            }
        });
        return expressions;
    }
};

var registerWatchers = function (labelWatcherArray, interpolationFunction, viewScope, step) {
    angular.forEach(getExpression(interpolationFunction), function (expression) {
        var watcher = viewScope.$watch(expression, function () {
            step.ncyBreadcrumbLabel = interpolationFunction(viewScope);
        });
        labelWatcherArray.push(watcher);
    });

};

var deregisterWatchers = function (labelWatcherArray) {
    angular.forEach(labelWatcherArray, function (deregisterWatch) {
        deregisterWatch();
    });
};

function BreadcrumbDirective($injector) {
    var $rootScope = $injector.get('$rootScope');
    var $breadcrumb = $injector.get('$breadcrumb');
    var $interpolate = $injector.get('$interpolate');
    var CONFIG = $injector.get('ncyBreadcrumbConfig');

    var $$templates = CONFIG.templates;

    return {
        restrict: 'AE',
        replace: true,
        scope: {},
        template: $breadcrumb.getTemplate($$templates),
        templateUrl: $breadcrumb.getTemplateUrl(),
        link: {
            post: function postLink(scope) {
                var labelWatchers = [];

                var renderBreadcrumb = function () {
                    deregisterWatchers(labelWatchers);
                    labelWatchers = [];

                    var viewScope = $breadcrumb.$getLastViewScope();
                    scope.steps = $breadcrumb.getStatesChain();
                    angular.forEach(scope.steps, function (step) {
                        if (step.ncyBreadcrumb && step.ncyBreadcrumb.label) {
                            var parseLabel = $interpolate(step.ncyBreadcrumb.label);
                            step.ncyBreadcrumbLabel = parseLabel(viewScope);
                            // Watcher for further viewScope updates
                            registerWatchers(labelWatchers, parseLabel, viewScope, step);
                        }
                        else {
                            step.ncyBreadcrumbLabel = step.name;
                        }
                    });
                };

                registerListenerOnce('BreadcrumbDirective.$viewContentLoaded', $rootScope, '$viewContentLoaded', function (event) {
                    if (!event.targetScope.ncyBreadcrumbIgnore) {
                        renderBreadcrumb();
                    }
                });

                // View(s) may be already loaded while the directive's linking
                renderBreadcrumb();
            }
        }
    };
}
BreadcrumbDirective.$inject = ['$injector'];

function BreadcrumbLastDirective($interpolate, $breadcrumb, $rootScope) {
    var $$templates = {
        'default': '{{ncyBreadcrumbLabel}}'
    };

    return {
        restrict: 'A',
        scope: {},
        template: $breadcrumb.getTemplateLast($$templates),
        templateUrl: $breadcrumb.getTemplateLastUrl(),
        compile: function (cElement, cAttrs) {

            // Override the default template if ncyBreadcrumbLast has a value
            // This should likely be removed in a future version since global
            // templating is now available for ncyBreadcrumbLast
            var template = cElement.attr(cAttrs.$attr.ncyBreadcrumbLast);
            if (template) {
                cElement.html(template);
            }

            return {
                post: function postLink(scope) {
                    var labelWatchers = [];

                    var renderLabel = function () {
                        deregisterWatchers(labelWatchers);
                        labelWatchers = [];

                        var viewScope = $breadcrumb.$getLastViewScope();
                        var lastStep = $breadcrumb.getLastStep();
                        if (lastStep) {
                            scope.ncyBreadcrumbLink = lastStep.ncyBreadcrumbLink;
                            if (lastStep.ncyBreadcrumb && lastStep.ncyBreadcrumb.label) {
                                var parseLabel = $interpolate(lastStep.ncyBreadcrumb.label);
                                scope.ncyBreadcrumbLabel = parseLabel(viewScope);
                                // Watcher for further viewScope updates
                                // Tricky last arg: the last step is the entire scope of the directive !
                                registerWatchers(labelWatchers, parseLabel, viewScope, scope);
                            }
                            else {
                                scope.ncyBreadcrumbLabel = lastStep.name;
                            }
                        }
                    };

                    registerListenerOnce('BreadcrumbLastDirective.$viewContentLoaded', $rootScope, '$viewContentLoaded', function (event) {
                        if (!event.targetScope.ncyBreadcrumbIgnore) {
                            renderLabel();
                        }
                    });

                    // View(s) may be already loaded while the directive's linking
                    renderLabel();
                }
            };

        }
    };
}
BreadcrumbLastDirective.$inject = ['$interpolate', '$breadcrumb', '$rootScope'];

function BreadcrumbTextDirective($interpolate, $breadcrumb, $rootScope) {

    return {
        restrict: 'A',
        scope: {},
        template: '{{ncyBreadcrumbChain}}',

        compile: function (cElement, cAttrs) {
            // Override the default template if ncyBreadcrumbText has a value
            var template = cElement.attr(cAttrs.$attr.ncyBreadcrumbText);
            if (template) {
                cElement.html(template);
            }

            var separator = cElement.attr(cAttrs.$attr.ncyBreadcrumbTextSeparator) || ' / ';

            return {
                post: function postLink(scope) {
                    var labelWatchers = [];

                    var registerWatchersText = function (labelWatcherArray, interpolationFunction, viewScope) {
                        angular.forEach(getExpression(interpolationFunction), function (expression) {
                            var watcher = viewScope.$watch(expression, function (newValue, oldValue) {
                                if (newValue !== oldValue) {
                                    renderLabel();
                                }
                            });
                            labelWatcherArray.push(watcher);
                        });
                    };

                    var renderLabel = function () {
                        deregisterWatchers(labelWatchers);
                        labelWatchers = [];

                        var viewScope = $breadcrumb.$getLastViewScope();
                        var steps = $breadcrumb.getStatesChain();
                        var combinedLabels = [];
                        angular.forEach(steps, function (step) {
                            if (step.ncyBreadcrumb && step.ncyBreadcrumb.label) {
                                var parseLabel = $interpolate(step.ncyBreadcrumb.label);
                                combinedLabels.push(parseLabel(viewScope));
                                // Watcher for further viewScope updates
                                registerWatchersText(labelWatchers, parseLabel, viewScope);
                            }
                            else {
                                combinedLabels.push(step.name);
                            }
                        });

                        scope.ncyBreadcrumbChain = combinedLabels.join(separator);
                    };

                    registerListenerOnce('BreadcrumbTextDirective.$viewContentLoaded', $rootScope, '$viewContentLoaded', function (event) {
                        if (!event.targetScope.ncyBreadcrumbIgnore) {
                            renderLabel();
                        }
                    });

                    // View(s) may be already loaded while the directive's linking
                    renderLabel();
                }
            };

        }
    };
}
BreadcrumbTextDirective.$inject = ['$interpolate', '$breadcrumb', '$rootScope'];

function BreadcrumbDynamicChain($injector) {

    var $rootScope = $injector.get('$rootScope');
    var $breadcrumb = $injector.get('$breadcrumb');
    var $interpolate = $injector.get('$interpolate');
    var CONFIG = $injector.get('ncyBreadcrumbConfig');

    var $$templates = CONFIG.templates;

    return {
        restrict: 'AE',
        replace: true,
        scope: {},
        template: $breadcrumb.getTemplate($$templates),
        templateUrl: $breadcrumb.getTemplateUrl(),
        link: {
            post: function postLink(scope) {
                var labelWatchers = [];
                var isDynamic;


                var setBreadcrumbLabel = function () {
                    var viewScope = $breadcrumb.$getLastViewScope();

                    angular.forEach(scope.steps, function (step) {
                        if (step.ncyBreadcrumb && step.ncyBreadcrumb.label) {
                            var parseLabel = $interpolate(step.ncyBreadcrumb.label);
                            step.ncyBreadcrumbLabel = parseLabel(viewScope);
                            // Watcher for further viewScope updates
                            registerWatchers(labelWatchers, parseLabel, viewScope, step);
                        }
                        else {
                            step.ncyBreadcrumbLabel = step.ncyBreadcrumbLabel || step.name;
                        }
                    });
                };

                var renderBreadcrumb = function () {
                    isDynamic = $breadcrumb.isDynamicChain();

                    if (isDynamic) {
                        $breadcrumb.getDynamicStatesChain().then(function (steps) {
                            scope.steps = steps;
                            setBreadcrumbLabel();
                        });
                    }
                    else {
                        scope.steps = $breadcrumb.getDynamicStatesChain();
                        setBreadcrumbLabel();
                    }
                };

                registerListenerOnce('BreadcrumbDirective.$viewContentLoaded', $rootScope, '$viewContentLoaded', function (event) {
                    if (!event.targetScope.ncyBreadcrumbIgnore) {
                        renderBreadcrumb();
                    }
                });

                // View(s) may be already loaded while the directive's linking
                renderBreadcrumb();
            }
        }
    };
}

BreadcrumbDynamicChain.$inject = ['$injector'];

angular
    .module('ncy-angular-breadcrumb', ['ui.router.state'])
    .provider('$breadcrumb', $Breadcrumb)
    .directive('ncyBreadcrumb', BreadcrumbDirective)
    .directive('ncyBreadcrumbLast', BreadcrumbLastDirective)
    .directive('ncyBreadcrumbText', BreadcrumbTextDirective)
    .directive('ncyBreadcrumbDynamicChain', BreadcrumbDynamicChain)
    .constant('ncyBreadcrumbConfig', {
        templates: {
            bootstrap2: '<ul class="breadcrumb">' +
                '<li ng-repeat="step in steps" ng-switch="$last || !!step.abstract" ng-class="{active: $last}">' +
                '<a ng-switch-when="false" href="{{step.ncyBreadcrumbLink}}">{{step.ncyBreadcrumbLabel}}</a>' +
                '<span ng-switch-when="true">{{step.ncyBreadcrumbLabel}}</span>' +
                '<span class="divider" ng-hide="$last">/</span>' +
                '</li>' +
                '</ul>',
            bootstrap3: '<ol class="breadcrumb">' +
                '<li ng-repeat="step in steps" ng-class="{active: $last}" ng-switch="$last || !!step.abstract">' +
                '<a ng-switch-when="false" href="{{step.ncyBreadcrumbLink}}">{{step.ncyBreadcrumbLabel}}</a>' +
                '<span ng-switch-when="true">{{step.ncyBreadcrumbLabel}}</span>' +
                '</li>' +
                '</ol>'
        }
    });
