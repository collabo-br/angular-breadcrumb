/*jshint undef: false */

describe('Breadcrumb directive with dynamic chain', function () {
    var element, scope, compile, timeout;

    beforeEach(function () {
        module('ncy-dynamic-chain-conf');
    });

    beforeEach(inject(function ($rootScope, $compile, $timeout) {
        element = angular.element('<div ncy-breadcrumb-dynamic-chain></div>');
        compile = $compile(element);
        scope = $rootScope.$new();
        timeout = $timeout;
    }));

    it('renders the correct state chain ', inject(function() {
        goToState('D.E');

        compile(scope);

        scope.$emit('$viewContentLoaded');
        scope.$digest();

        console.info('Directive content : ' + element.text());

        expect(element.text()).toContain('State A');
        expect(element.text()).toContain('State D');
        expect(element.text()).toContain('State D.E');

        expect(element.find('a').eq(0).attr('href')).toBe('#/a');
        expect(element.find('a').eq(1).attr('href')).toBe('#/d');

        expect(element.children().length).toBe(3);
    }));

    it('renders the correct state dynamic chain', inject(function () {
        goToState('A.B.C');

        compile(scope);

        scope.$emit('$viewContentLoaded');
        scope.$digest();

        timeout.flush(1000);

        console.info('Directive content : ' + element.text());

        expect(element.text()).toContain('State A');
        expect(element.text()).toContain('State A-B');
        expect(element.text()).toContain('State A-B-C');

        expect(element.find('a').eq(0).attr('href')).toBe('#/a');
        expect(element.find('a').eq(1).attr('href')).toBe('#/a/b/a-b');

        expect(element.children().length).toBe(3);
    }));

    it('renders "A.B.C.RECURSIVE" label correctly', inject(function () {
        goToState('A.B.C.RECURSIVE', {slug: 'a-b-2'});

        compile(scope);

        scope.$emit('$viewContentLoaded');
        scope.$digest();

        timeout.flush(1000);

        console.info('Directive content : ' + element.text());
        expect(element.text()).toContain('State A');
        expect(element.text()).toContain('State A-B');
        expect(element.text()).toContain('State A-B-2');
        expect(element.text()).toContain('State A-B-C');
        expect(element.text()).toContain('State A.B.C.RECURSIVE');

        expect(element.find('a').eq(0).attr('href')).toBe('#/a');
        expect(element.find('a').eq(1).attr('href')).toBe('#/a/b/a-b');
        expect(element.find('a').eq(2).attr('href')).toBe('#/a/b/a-b-2');
        expect(element.find('a').eq(3).attr('href')).toBe('#/a/b/a-b-2/c');

        expect(element.children().length).toBe(5);
    }));

});
