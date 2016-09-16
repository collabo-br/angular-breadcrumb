# [![angular-breadcrumb](https://raw.github.com/ncuillery/angular-breadcrumb/master/sample/img/logo/angular-breadcrumb-logo-400.png)](http://ncuillery.github.io/angular-breadcrumb/)


[Angular-breadcrumb](https://github.com/ncuillery/angular-breadcrumb) with an additional feature, the directive 'ncyBreadcrumbDynamicChain'.
This directive renders dynamic steps of the breadcrumb.
The property 'ncyBreadcrumb.dynamicStatesChain' in states configuration is a function that returns an array of objects containing the breadcrumb steps.
It is useful when states are parent of itself (recursive) in the breadcrumb, or when the steps come from another service.
For example, in routes with category hierarchy, category({ id : 1 }) > category({ id : 2 }) > product :

```
$stateProvider.state('category', {
  url:'/:id',
  ncyBreadcrumb: {
    dynamicStatesChain: function($injector){
      var myService = $injector.get('myService');

      //The promise resolves with:
      //[{ label: 'Category A', state: 'category({ id : 1 })'},{ label: 'Category B', state: 'category({ id : 2 })'}],
      var promise = myService.getSteps();
      return promise;
    }
  }
}).state('product', {
  url:'/product',
  ncyBreadcrumb: {
    label : 'Product'
  }
});
```

## Sample
See angular-breadcrumb with dynamic chain in action [here](http://embed.plnkr.co/mRaWgIW4QgZjD3HDt8aF/)

## License
Copyright (c) 2013 Nicolas Cuillery  
Licensed under the MIT license.
