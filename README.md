# Extension to test ESI content #

You can use it with Symfony, for example.  
The extension adds Surrogate-Capability header so site, that can work with ESI (for example that made with Symfony) will return esi:includes.  
The extension replaces esi:includes with actual HTML and writes information about loaded ESI fragments in Web Inspector Console.  
Later will add other ESI options.  
It works only for Firefox because Chrome doesn't support browser.webRequest.filterResponseData.  

## More about ESI ##

https://www.w3.org/TR/esi-lang  


## About ##

Author: Dima Kurilo <dkurilo@gmail.com>  
Site: https://www.kurilo.us/  
GitHub: https://github.com/DKurilo/esi-testing-extension  
Extension page: https://addons.mozilla.org/en-US/firefox/addon/esi-testing-extension/?src=userprofile  
Minimal Firefox version: 57.0  
