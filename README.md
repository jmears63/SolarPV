# SolarPV
Web pages for providing graphical monitoring of Bosch BPTS-4 Solar Inverters.

## Summary
The Bosch BPTS-4 inverter for domestic solar installations includes a web server acessible from the LAN to which the inverter is conenected. The web server servers pages which allow current solar generation to be monitored via a web browser. These web pages have some limitations, however. This project provides an alternative set of pages for monitoring and graphing your solar generation.
## Features
* High quality graphs.
* Uses all screeen space however large or small your monitor is.
* Works well on tablets and phones.
* Includes sample data.
* No animations or other UI gimmicks.

## Installation
Simple - there is no installation. All the funcionality in these pages is
client side in javascript. The server only needs to server static content, and
github will do that job for us:

http://jmears63.github.io/SolarPV

If you like, you can copy the pages to your own server, but there is no need.

## Configuration
When you first access these pages from your web browser, it will display sample
data to give you an idea what the graphs look like. To make it access your Bosch
inverter, you need to:

* Make sure your Bosch invertor is accessible from the same network as your browser.
Check this by navigating to the hostname or IP of your inverter. You should see the
Bosch e.Data web page.
* Navigate to http://jmears63.github.io/SolarPV and click on the settings
button in the top right (with the gear symbol on).
* Check "Read data from Bosch inverter", enter the inverter hostname or IP, and
click OK.

Your configuration settings will be remembered by the browser. If you use a different
browser, you must repeat the configuration there.


## Technologies
* AngularJS
* Bootstrap
* D3

## Screen Shots
See the screendumps directory for a full set of screen dumps.

![Alt text](screendumps/PVGraph.png?raw=true "PV Graph")

## The Author
I am an experienced SaaS/Cloud software architect and developer. In my spare time
I enjoy cycling, playing double bass, and figuring out ways of saving energy. 

You can find out more about me here: https://www.linkedin.com/in/mearsjohn. 
