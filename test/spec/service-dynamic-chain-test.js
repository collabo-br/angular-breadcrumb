/*jshint undef: false */

describe('Service with dynamic chain conf', function () {
    var timeout, interpolate;

    beforeEach(function () {
        module('ncy-dynamic-chain-conf');
    });

    beforeEach(inject(function ($timeout, $interpolate) {
        timeout = $timeout;
        interpolate = $interpolate;
    }));

    it('must be defined', inject(function ($breadcrumb) {
        expect($breadcrumb).toBeDefined();
    }));


    it('generate two steps for the "A.B" state with dynamic chain', inject(function ($breadcrumb) {
        goToState('A.B', {
            slug: "a-b"
        });

        $breadcrumb.getDynamicStatesChain().then(function (chain) {
            expect(stringifyStateChain(chain)).toBe('A --> A.B');
        });

        timeout.flush(1000);

        var lastStep = $breadcrumb.getLastStep();
        expect(lastStep.name).toBe('A.B');
    }));

    it('must build a correct link for the "A.B.C" state with dynamic chain', inject(function ($breadcrumb) {
        goToState('A.B.C', {
            slug: 'a-b'
        });

        $breadcrumb.getDynamicStatesChain().then(function (statesChain) {
            expect(stringifyStateChain(statesChain)).toBe('A --> A.B --> A.B.C');

            expect(statesChain[0].ncyBreadcrumbLink).toBe('#/a');
            expect(statesChain[1].ncyBreadcrumbLink).toBe('#/a/b/a-b');
            expect(statesChain[2].ncyBreadcrumbLink).toBe('#/a/b/a-b/c');
        });

        timeout.flush(1000);
    }));

    it('generate four steps for the "A.B.C.RECURSIVE" state with working links and correct label', inject(function ($breadcrumb) {
        goToState('A.B.C.RECURSIVE', {
            slug: 'a-b-2'
        });

        $breadcrumb.getDynamicStatesChain().then(function (statesChain) {
            expect(stringifyStateChain(statesChain)).toBe('A --> A.B --> A.B --> A.B.C --> A.B.C.RECURSIVE');

            statesChain.forEach(function (step) {
                if (step.ncyBreadcrumb && step.ncyBreadcrumb.label) {
                    step.ncyBreadcrumbLabel = step.ncyBreadcrumb.label;
                }
            });

            expect(statesChain[0].ncyBreadcrumbLink).toBe('#/a');
            expect(statesChain[1].ncyBreadcrumbLink).toBe('#/a/b/a-b');
            expect(statesChain[2].ncyBreadcrumbLink).toBe('#/a/b/a-b-2');
            expect(statesChain[3].ncyBreadcrumbLink).toBe('#/a/b/a-b-2/c');
            expect(statesChain[4].ncyBreadcrumbLink).toBe('#/a/b/a-b-2/c/recursive');

            expect(statesChain[0].ncyBreadcrumbLabel).toBe('State A');
            expect(statesChain[1].ncyBreadcrumbLabel).toBe('State A-B');
            expect(statesChain[2].ncyBreadcrumbLabel).toBe('State A-B-2');
            expect(statesChain[3].ncyBreadcrumbLabel).toBe('State A-B-C');
            expect(statesChain[4].ncyBreadcrumbLabel).toBe('State A.B.C.RECURSIVE');

            var lastStep = $breadcrumb.getLastStep();
            expect(lastStep.name).toBe('A.B.C.RECURSIVE');
        });

        timeout.flush(1000);
    }));

    it('generate steps for the "D.E" state without dynamic chain', inject(function ($breadcrumb) {
        goToState('D.E');

        var statesChain = $breadcrumb.getDynamicStatesChain();
        expect(stringifyStateChain(statesChain)).toBe('A --> D --> D.E');

        var lastStep = $breadcrumb.getLastStep();
        expect(lastStep.name).toBe('D.E');
    }));

});
