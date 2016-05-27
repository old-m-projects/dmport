# Docker Machine Import Export Utility

## Export docker machine credentials from one manchine to another.
 
 ```
  Usage: dmport [options]

  Options:

    -h, --help            output usage information
    -V, --version         output the version number
    -x, --export [value]  export docker machine, value is the name of the machine
    -i, --import [value]  import json encoded output from dmport export.
 ```
 
### NOTES! 

- Currently only handles importing / exporting of 1 machine at a time
- Currently requires docker-machine to be available in the path
- use the following to set env vars for machine, certificates will also be written to file

 ```
 eval $(dmport -i $ENVVAR_W_EXPORT_JSON) 
 ```
 
 ***caution*** This will overwrite your ca certs when importing make sure you have proper back ups
 
 From your friends @ [mumba.cloud](http://mumba.cloud)
 
### Acknowledgements
The idea for exporting as a JSON string came from [docker-machine-export](https://github.com/blackbeardapp/docker-machine-export)