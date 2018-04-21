# Extension to test ESI content #

You can use it with Symfony, for example.  
The extension adds Surrogate-Capability header so site, that sites with ESI (for example that made with Symfony) will return esi:includes and other ESI tags.  
The extension replaces esi tags with actual HTML and writes information about loaded ESI fragments in Web Inspector Console and in Extension's popup.  
It works only for Firefox because Chrome doesn't support browser.webRequest.filterResponseData.  

## Supported ESI tags ##

1. esi:include  
2. esi:comment  
3. esi:remove  
4. &lt;!--esi  
  
Later will add other ESI options.  


## More about ESI ##

https://www.w3.org/TR/esi-lang  


## About ##

Author: Dima Kurilo <dkurilo@gmail.com>  
GitHub: https://github.com/DKurilo/esi_testing_extension  
Extension page: https://addons.mozilla.org/en-US/firefox/addon/esi-testing-extension/?src=userprofile  
Minimal Firefox version: 57.0  
